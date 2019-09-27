import { getLogger } from "..";
import config from "../config";
import { Errors, identityUtils, nameservice } from "../packages";

const log = getLogger(__filename);

export abstract class NameServiceConfigurationService {
    constructor() {
        log.info(`Initizing NameServiceConfigurationService with options:- `);
    }

    public abstract getGlobalAssetList = async (): Promise<object> => ({});
    public abstract getClientAssetMapping = async (clientName: string): Promise<object> => ({});
    public abstract getClientConfig = async (clientName: string): Promise<any> => ({});
}

export class BlockstackConfigurationService extends NameServiceConfigurationService {

    private settingsDomain = config.BLOCKSTACK.SETTINGS_DOMAIN;

    private blockstackNameservice: nameservice.BlockstackService;
    private clientName: string;
    private clientConfig: any;

    constructor(clientName: string) {
        super();
        this.clientName = clientName;
        this.blockstackNameservice = new nameservice.BlockstackService();
        log.info(`BlockstackConfigurationService initialised with default configs`);
    }

    public init = async () => {
        this.clientConfig = await this.getClientConfig(this.clientName);
    }
    public getGlobalAssetList = async (): Promise<object> => {
        console.groupCollapsed("Resolving globalAssetlist from gaiaHub");
        const blockstackId = `${this.settingsDomain}.id`;
        let assetList: object
        try {
            assetList  =  await this.blockstackNameservice.getContentFromGaiaHub(blockstackId, "asset-list.json", "application/json");
        } catch (error) {
            console.groupEnd();
            if(error instanceof Errors.PackageError){throw error}
            throw `Unable to decode address mapping, ${error}`;
        }
        console.groupEnd();
        return assetList;
    }

    public getClientConfig = async (clientName: string): Promise<any> => {
        console.groupCollapsed("Resolving clientAssetMapping from gaiaHub");
        const bsid = new identityUtils.BlockstackId({domain: this.settingsDomain, subdomain: clientName});
        let clientConfig: any
        try {
            clientConfig  =  await this.blockstackNameservice.getContentFromGaiaHub(bsid.toString(), "client-config.json", "application/json");
            if (!clientConfig) {
                console.groupEnd();
                throw new Error(`invalid client config`);
            }
        } catch (error) {
            console.groupEnd();
            if(error instanceof Errors.PackageError) throw error
            throw new Error(`failed to get client config from gaiahub, error is:- ${error}`);
        }
        console.groupEnd();
        return clientConfig;
    }

    public getClientAssetMapping = async (clientName: string): Promise<object> => {
        const clientConfig = await this.clientConfig;
        if (clientConfig.assetMapping) {
            return clientConfig.assetMapping;
        } else {
            return {};
        }
    }

    public getBlockstackServiceForConfig = async (clientname: string): Promise<nameservice.BlockstackService> => {
        if (!this.clientConfig) { throw new Error(`missing client-config for ${this.clientName}!`); }
        let ns: nameservice.BlockstackService;
        if (this.clientConfig.nameserviceConfiguration) {
            ns = new nameservice.BlockstackService(this.clientConfig.nameserviceConfiguration);
        } else {
            ns = new nameservice.BlockstackService();
        }
        return ns;
    }

    public getVirtualAddressFromClientName = (clientName: string): string => {
        return clientName +  "." + this.settingsDomain;
    }

}