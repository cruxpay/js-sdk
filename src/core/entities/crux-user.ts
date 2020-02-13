import { BaseError } from "../../packages/error";
import { CruxId } from "../../packages/identity-utils";
import { getLogger } from "../../packages/logger";
import { CruxDomain, IGlobalAsset, IGlobalAssetList } from "./crux-domain";
import { CruxSpec } from "./crux-spec";

const log = getLogger(__filename);

export interface IAddress {
    addressHash: string;
    secIdentifier?: string;
}

export interface IAddressMapping {
    [currency: string]: IAddress;
}

export interface ICruxUserRegistrationStatus {
    status: SubdomainRegistrationStatus;
    statusDetail: SubdomainRegistrationStatusDetail;
}

export interface ICruxUserInformation {
    registrationStatus: ICruxUserRegistrationStatus;
    transactionHash?: string;
    ownerAddress?: string;
}

export interface ICruxUserData {
    configuration: ICruxUserConfiguration;
}

export interface ICruxUserConfiguration {
    enabledParentAssetFallbacks: string[];
}

export enum SubdomainRegistrationStatus {
    NONE = "NONE",
    PENDING = "PENDING",
    DONE = "DONE",
    REJECT = "REJECT",
}

export enum SubdomainRegistrationStatusDetail {
    NONE = "Subdomain not registered with this registrar.",
    PENDING_REGISTRAR = "Subdomain registration pending on registrar.",
    PENDING_BLOCKCHAIN = "Subdomain registration pending on blockchain.",
    DONE = "Subdomain propagated.",
}

export class CruxUser {
    private cruxUserInformation!: ICruxUserInformation;
    private cruxUserID!: CruxId;
    private addressMap!: IAddressMapping;
    private cruxUserConfig!: ICruxUserConfiguration;
    private cruxDomain!: CruxDomain;

    constructor(cruxUserSubdomain: string, cruxDomain: CruxDomain, addressMap: IAddressMapping, cruxUserInformation: ICruxUserInformation, cruxUserData: ICruxUserData) {
        this.setCruxDomain(cruxDomain);
        this.setCruxUserID(cruxUserSubdomain);
        this.setAddressMap(addressMap);
        this.setCruxUserInformation(cruxUserInformation);
        this.setCruxUserConfig(cruxUserData.configuration);
        log.debug("CruxUser initialised");
    }
    get cruxID() {
        return this.cruxUserID;
    }
    get domain() {
        return this.cruxDomain;
    }
    get info() {
        return this.cruxUserInformation;
    }
    get config() {
        return this.cruxUserConfig;
    }
    public setParentAssetFallbacks = (assetGroups: string[]) => {
        // validate the assetIdAssetGroup is supported by the walletClient
        assetGroups.forEach((assetGroup) => {
            if (!this.cruxDomain.config.supportedParentAssetFallbacks.includes(assetGroup)) {
                throw new BaseError(null, "assetGroup not supported by domain");
            }
        });
        const enabledFallbacksSet = new Set(assetGroups);
        this.cruxUserConfig.enabledParentAssetFallbacks = [...enabledFallbacksSet];
    }
    public getAddressMap(): IAddressMapping {
        return this.addressMap;
    }
    public setAddressMap(addressMap: IAddressMapping) {
        // addressMap is not validated due to the presence of magic key: "__userData__";
        this.addressMap = addressMap;
    }
    public getAddressFromAsset(asset: IGlobalAsset): IAddress|undefined {
        const addressResolver = new CruxUserAddressResolver(this.addressMap, this.cruxDomain.config.assetList, this.cruxUserConfig);
        return addressResolver.resolveAddressWithAsset(asset);
    }
    public getAddressFromAssetMatcher(assetMatcher: IAssetMatcher): IAddress|undefined {
        const addressResolver = new CruxUserAddressResolver(this.addressMap, this.cruxDomain.config.assetList, this.cruxUserConfig);
        return addressResolver.resolveAddressWithAssetMatcher(assetMatcher);
    }
    private setCruxDomain = (cruxDomain: CruxDomain) => {
        if (!(cruxDomain instanceof CruxDomain)) {
            throw new BaseError(null, "Invalid cruxDomain provided in CruxUser");
        }
        this.cruxDomain = cruxDomain;
    }
    private setCruxUserID = (cruxUserSubdomain: string) => {
        this.cruxUserID = new CruxId({
            domain: this.cruxDomain.id.components.domain,
            subdomain: cruxUserSubdomain,
        });
    }
    private setCruxUserInformation = (cruxUserInformation: ICruxUserInformation) => {
        // validate and set the cruxUserInformation
        if (!(Object.values(SubdomainRegistrationStatus).includes(cruxUserInformation.registrationStatus.status))) {
            throw new BaseError(null, `Subdomain registration status validation failed!`);
        }
        if (!(Object.values(SubdomainRegistrationStatusDetail).includes(cruxUserInformation.registrationStatus.statusDetail))) {
            throw new BaseError(null, `Subdomain registration status detail validation failed!`);
        }
        this.cruxUserInformation = cruxUserInformation;
    }
    private setCruxUserConfig = (cruxUserConfiguration: ICruxUserConfiguration) => {
        // TODO: validation of the configurations
        this.cruxUserConfig = cruxUserConfiguration;
    }
}

export interface IAssetMatcher {
    assetGroup: string;
    assetIdentifierValue?: string|number;
}

export class CruxUserAddressResolver {
    private userAddressMap: IAddressMapping;
    private userClientAssetList: IGlobalAssetList;
    private userConfig: ICruxUserConfiguration;
    constructor(cruxUserAddressMap: IAddressMapping, cruxUserClientAssetList: IGlobalAssetList, cruxUserConfig: ICruxUserConfiguration) {
        this.userAddressMap = cruxUserAddressMap;
        this.userClientAssetList = cruxUserClientAssetList;
        this.userConfig = cruxUserConfig;
    }
    public resolveAddressWithAsset = (asset: IGlobalAsset): IAddress|undefined => {
        let address: IAddress|undefined;
        // check for the address using the assetId
        address = this.userAddressMap[asset.assetId];
        // if address not found, check the parentAssetFallback config
        if (!address) {
            const parentFallbackKey = this.assetToParentFallbackKey(asset);
            address = parentFallbackKey ? this.resolveFallbackAddressIfEnabled(parentFallbackKey) : undefined;
        }
        return address;
    }
    public resolveAddressWithAssetMatcher = (assetMatcher: IAssetMatcher): IAddress|undefined => {
        let address: IAddress|undefined;
        // if assetIdentifier is provided, find the asset matching the identifier
        if (assetMatcher.assetIdentifierValue) {
            const asset = this.findAssetWithAssetMatcher(assetMatcher);
            // if asset is available, resolve the address with asset found
            if (asset) {
                address = this.resolveAddressWithAsset(asset);
            } else {
                address = this.resolveFallbackAddressIfEnabled(assetMatcher.assetGroup);
            }
        } else {
            address = this.resolveFallbackAddressIfEnabled(assetMatcher.assetGroup);
        }
        return address;
    }
    private findAssetWithAssetMatcher = (assetMatcher: IAssetMatcher): IGlobalAsset|undefined => {
        const asset = this.userClientAssetList.find((a) => {
            let match = false;
            let assetIdentifierValueMatch = false;
            // matching the assetIdentifierValue
            if (typeof a.assetIdentifierValue === "string" && typeof assetMatcher.assetIdentifierValue === "string" && a.assetIdentifierValue.toLowerCase() === assetMatcher.assetIdentifierValue.toLowerCase()) {
                assetIdentifierValueMatch = true;
            } else if (typeof a.assetIdentifierValue === "number" && typeof assetMatcher.assetIdentifierValue === "number" && a.assetIdentifierValue === assetMatcher.assetIdentifierValue) {
                assetIdentifierValueMatch = true;
            }
            // matching the parentFallbackKey
            if (assetIdentifierValueMatch) {
                const parentFallbackKey = this.assetToParentFallbackKey(a);
                match = Boolean(parentFallbackKey && (parentFallbackKey === assetMatcher.assetGroup));
            }
            return match;
        });
        return asset;
    }
    private resolveFallbackAddressIfEnabled = (parentFallbackKey: string): IAddress|undefined => {
        let address: IAddress|undefined;
        const isFallbackEnabled = this.userConfig.enabledParentAssetFallbacks.includes(parentFallbackKey);
        // if fallback enabled, find the parentAsset's address
        if (isFallbackEnabled) {
            const parentAssetId = parentFallbackKey.split("_")[1];
            address = this.userAddressMap[parentAssetId];
        }
        return address;
    }
    private assetToParentFallbackKey = (asset: IGlobalAsset): string|undefined => {
        if (!asset.assetType || !asset.parentAssetId) {
            return;
        }
        return `${asset.assetType}_${asset.parentAssetId}`;
    }
}
