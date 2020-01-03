// Importing packages
import { CruxAssetTranslator, IPutAddressMapFailures, IPutAddressMapSuccess, IResolvedClientAssetMap } from "../core/entities/crux-asset-translator";
import { CruxDomain } from "../core/entities/crux-domain";
import { CruxSpec } from "../core/entities/crux-spec";
import { CruxUser, IAddress, IAddressMapping } from "../core/entities/crux-user";
import { ICruxBlockstackInfrastructure } from "../core/interfaces";
import { ICruxUserRepository } from "../core/interfaces/crux-user-repository";
import { IKeyManager } from "../core/interfaces/key-manager";
import { ICruxIDState, setCacheStorage } from "../index";
import { BasicKeyManager } from "../infrastructure/implementations/basic-key-manager";
import { BlockstackCruxDomainRepository } from "../infrastructure/implementations/blockstack-crux-domain-repository";
import { BlockstackCruxUserRepository } from "../infrastructure/implementations/blockstack-crux-user-repository";
import { BaseError, CruxClientError, ErrorHelper, PackageErrorCode } from "../packages/error";
import { CruxDomainId, CruxId, InputIDComponents } from "../packages/identity-utils";
import { InMemStorage } from "../packages/inmem-storage";
import { StorageService } from "../packages/storage";
import { cloneValue } from "../packages/utils";

export const throwCruxClientError = (target: any, prop: any, descriptor?: { value?: any; }): any => {
    let fn: any;
    let patchedFn: any;
    if (descriptor) {
        fn = descriptor.value;
    }
    return {
        configurable: true,
        enumerable: true,
        get() {
            if (!patchedFn) {
                patchedFn = async (...params: any[]) => {
                    try {
                        return await fn.call(this, ...params);
                    } catch (error) {
                        throw CruxClientError.fromError(error);
                    }
                };
            }
            return patchedFn;
        },
        set(newFn: any) {
            patchedFn = undefined;
            fn = newFn;
        },
    };
};
export interface ICruxWalletClientOptions {
    privateKey?: string;
    blockstackInfrastructure?: ICruxBlockstackInfrastructure;
    cacheStorage?: StorageService;
    walletClientName: string;
}

export class CruxWalletClient {
    public walletClientName: string;
    private cruxBlockstackInfrastructure: ICruxBlockstackInfrastructure;
    private _initPromise: Promise<void>;
    private _cruxUser?: CruxUser;
    private cruxDomain?: CruxDomain;
    private _cruxUserRepository: ICruxUserRepository;
    private _cruxAssetTranslator?: CruxAssetTranslator;
    private _keyManager?: IKeyManager;
    private resolvedClientAssetMapping?: IResolvedClientAssetMap;
    private cacheStorage?: StorageService;

    constructor(options: ICruxWalletClientOptions) {
        setCacheStorage(options.cacheStorage || new InMemStorage());
        this.cruxBlockstackInfrastructure = options.blockstackInfrastructure || CruxSpec.blockstack.infrastructure;
        this.walletClientName = options.walletClientName;
        this._cruxUserRepository = new BlockstackCruxUserRepository({cacheStorage: this.cacheStorage, blockstackInfrastructure: this.cruxBlockstackInfrastructure});
        this._initPromise = this._init(options);
    }

    @throwCruxClientError
    public getCruxIDState = async (): Promise<ICruxIDState> => {
        await this._initPromise;
        if (!this._cruxUser) {
            if (this._keyManager) {
                return {
                    cruxID: null,
                    status: {
                        status: "NONE",
                        statusDetail: "",
                    },
                };
            } else {
                throw ErrorHelper.getPackageError(null, PackageErrorCode.PrivateKeyRequired);
            }
        }
        return {
            cruxID: this._cruxUser.cruxID.toString(),
            status : this._cruxUser.registrationStatus,
        };
    }

    @throwCruxClientError
    public resolveCurrencyAddressForCruxID = async (fullCruxID: string, walletCurrencySymbol: string): Promise<IAddress> => {
        await this._initPromise;
        const cruxUser = await this._getCruxUserByID(fullCruxID);
        if (!cruxUser) {
            throw ErrorHelper.getPackageError(null, PackageErrorCode.UserDoesNotExist);
        }
        const assetId = this._getCruxAssetTranslator().symbolToAssetId(walletCurrencySymbol);
        if (!assetId) {
            throw ErrorHelper.getPackageError(null, PackageErrorCode.AssetIDNotAvailable);
        }
        const address =  cruxUser.getAddressFromAsset(assetId);
        if (!address) {
            throw ErrorHelper.getPackageError(null, PackageErrorCode.AddressNotAvailable);
        }
        return address;
    }

    @throwCruxClientError
    public getAddressMap = async (): Promise<IAddressMapping> => {
        await this._initPromise;
        if (!this._keyManager) {
            throw ErrorHelper.getPackageError(null, PackageErrorCode.PrivateKeyRequired);
        }
        if (this._cruxUser) {
            const assetIdAddressMap = this._cruxUser.getAddressMap();
            return this._getCruxAssetTranslator().assetIdAddressMapToSymbolAddressMap(assetIdAddressMap);
        }
        return {};
    }

    @throwCruxClientError
    public putAddressMap = async (newAddressMap: IAddressMapping): Promise<{success: IPutAddressMapSuccess, failures: IPutAddressMapFailures}> => {
        await this._initPromise;
        if (!this._keyManager) {
            throw ErrorHelper.getPackageError(null, PackageErrorCode.PrivateKeyRequired);
        }
        const {assetAddressMap, success, failures} = this._getCruxAssetTranslator().symbolAddressMapToAssetIdAddressMap(newAddressMap);
        if (!this._cruxUser) {
            throw ErrorHelper.getPackageError(null, PackageErrorCode.UserDoesNotExist);
        }
        const cruxUser = cloneValue(this._cruxUser);
        cruxUser.addressMap = assetAddressMap;
        this._cruxUser = await this._cruxUserRepository.save(cruxUser, this._keyManager);
        return {success, failures};
    }

    @throwCruxClientError
    public isCruxIDAvailable = async (cruxIDSubdomain: string): Promise<boolean> => {
        await this._initPromise;
        const cruxIdInput: InputIDComponents = {
            domain: this.walletClientName,
            subdomain: cruxIDSubdomain,
        };
        const cruxId = new CruxId(cruxIdInput);
        return await this._cruxUserRepository.find(cruxId);
    }

    @throwCruxClientError
    public registerCruxID = async (cruxIDSubdomain: string): Promise<void> => {
        await this._initPromise;
        if (!this._keyManager) {
            throw ErrorHelper.getPackageError(null, PackageErrorCode.PrivateKeyRequired);
        }
        if (this._cruxUser) {
            throw ErrorHelper.getPackageError(null, PackageErrorCode.ExistingCruxIDFound, this._cruxUser.cruxID);
        }
        const cruxIdInput: InputIDComponents = {
            domain: this.walletClientName,
            subdomain: cruxIDSubdomain,
        };
        const cruxId = new CruxId(cruxIdInput);
        this._cruxUser = await this._cruxUserRepository.create(cruxId, this._keyManager);
    }

    @throwCruxClientError
    public getAssetMap = async (): Promise<IResolvedClientAssetMap> => {
        await this._initPromise;
        if (this.resolvedClientAssetMapping) {
            return this.resolvedClientAssetMapping;
        }
        return this._getCruxAssetTranslator().assetIdAssetMapToSymbolAssetMap(this.getCruxDomain().config.assetList);
    }

    private _getCruxUserByID = async (cruxIdString: string): Promise<CruxUser|undefined> => {
        const cruxId = CruxId.fromString(cruxIdString);
        return await this._cruxUserRepository.getByCruxId(cruxId);
    }

    private _getCruxAssetTranslator = () => {
        if (!this._cruxAssetTranslator) {
            throw new BaseError(null, "");
        }
        return this._cruxAssetTranslator;
    }

    private getCruxDomain = () => {
        if (!this.cruxDomain) {
            throw new BaseError(null, "");
        }
        return this.cruxDomain;
    }

    private _init = async (options: ICruxWalletClientOptions): Promise<void> => {
        const cruxDomainId = new CruxDomainId(this.walletClientName);
        this.cruxDomain = await new BlockstackCruxDomainRepository({cacheStorage: this.cacheStorage, blockstackInfrastructure: this.cruxBlockstackInfrastructure}).get(cruxDomainId);
        if (!this.cruxDomain) {
            throw ErrorHelper.getPackageError(null, PackageErrorCode.CouldNotFindBlockstackConfigurationServiceClientConfig);
        }
        if (options.privateKey) {
            this._keyManager = new BasicKeyManager(options.privateKey);
            this._cruxUser = await this._cruxUserRepository.getWithKey(this._keyManager, cruxDomainId);
        }
        this._cruxAssetTranslator = await new CruxAssetTranslator(this.cruxDomain.config.assetMapping);
    }
}
