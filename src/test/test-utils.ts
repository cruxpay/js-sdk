import {publicKeyToAddress} from "blockstack/lib";
import {CruxDomain, DomainRegistrationStatus, IClientConfig} from "../core/entities/crux-domain";
import {CruxSpec} from "../core/entities/crux-spec";
import {
    CruxUser,
    IAddress,
    IAddressMapping,
    SubdomainRegistrationStatus,
    SubdomainRegistrationStatusDetail,
    ICruxUserInformation,
    ICruxUserData
} from "../core/entities/crux-user";
import {ICruxDomainRepository} from "../core/interfaces/crux-domain-repository";
import {ICruxUserRepository} from "../core/interfaces/crux-user-repository";
import {IKeyManager} from "../core/interfaces/key-manager";
import {CruxDomainId, CruxId} from "../packages/identity-utils";

class MockUserStore {
    private userById: any;
    private userByKeyAndDomain: any;

    constructor() {
        this.userById = {};
        this.userByKeyAndDomain = {};
    }

    public store = (cruxUser: CruxUser, address: string) => {
        this.userById[cruxUser.cruxID.toString()] = cruxUser;
        this.userByKeyAndDomain[String([address, cruxUser.cruxID.components.domain])] = cruxUser;
    };
    public getById = (cruxId: CruxId) => {
        return this.userById[cruxId.toString()];
    };
    public getByOwnerAddressAndDomain = (address: string, cruxDomainId: CruxDomainId) => {
        return this.userByKeyAndDomain[String([address, cruxDomainId.components.domain])];
    };
}

export class InMemoryCruxUserRepository implements ICruxUserRepository {
    private userStore: MockUserStore;
    private domain: CruxDomain;

    constructor(domain: CruxDomain) {
        this.userStore = new MockUserStore();
        this.domain = domain;
    }

    create = async (cruxIdSubdomain: string, keyManager: IKeyManager): Promise<CruxUser> => {
        if (!(await this.isCruxIdAvailable(cruxIdSubdomain))) {
            throw Error("Already Exists");
        }
        const newUser = new CruxUser(cruxIdSubdomain, this.domain, {}, {
            registrationStatus: {
                status: SubdomainRegistrationStatus.PENDING,
                statusDetail: SubdomainRegistrationStatusDetail.PENDING_REGISTRAR,
            }
        },{
            configuration: {
                enabledAssetGroups: [],
        }});
        const addressFromKeyManager = publicKeyToAddress(await keyManager.getPubKey());
        this.userStore.store(newUser, addressFromKeyManager);
        return new Promise((resolve, reject) => resolve(newUser));
    };
    isCruxIdAvailable = (cruxIdSubdomain: string): Promise<boolean> => {
        const cruxID = new CruxId({domain: this.domain.id.components.domain, subdomain: cruxIdSubdomain})
        const result = this.userStore.getById(cruxID) === undefined;
        return new Promise((resolve, reject) => resolve(result));
    };
    getByCruxId = (cruxID: CruxId, tag?: string): Promise<CruxUser | undefined> => {
        const result = this.userStore.getById(cruxID);
        return new Promise((resolve, reject) => resolve(result));
    };
    getWithKey = async (keyManager: IKeyManager): Promise<CruxUser | undefined> => {
        const addressFromKeyManager = publicKeyToAddress(await keyManager.getPubKey());
        const result = this.userStore.getByOwnerAddressAndDomain(addressFromKeyManager, this.domain.id);
        return new Promise((resolve, reject) => resolve(result));
    };
    save = async (cruxUser: CruxUser, keyManager: IKeyManager): Promise<CruxUser> => {
        if (this.userStore.getById(cruxUser.cruxID) === undefined) {
            throw Error("Cannot Save, No such CruxUser exists with this ID");
        }
        const addressFromKeyManager = publicKeyToAddress(await keyManager.getPubKey());
        if (this.userStore.getByOwnerAddressAndDomain(addressFromKeyManager, new CruxDomainId(cruxUser.cruxID.components.domain)) === undefined) {
            throw Error("User exists but provided Key is wrong");
        }
        this.userStore.store(cruxUser, addressFromKeyManager);
        return new Promise((resolve, reject) => resolve(cruxUser));
    };

}

export class InMemoryCruxDomainRepository implements ICruxDomainRepository {
    private domainById: any;

    constructor() {
        this.domainById = {};
    }

    public create = (domainId: CruxDomainId, identityKeyManager: IKeyManager): Promise<CruxDomain> => {
        const newDomain = new CruxDomain(domainId, DomainRegistrationStatus.REGISTERED, {assetList: [], assetMapping: {}, supportedAssetGroups: []});
        this.domainById[domainId.toString()] = newDomain;
        return new Promise((resolve, reject) => resolve(newDomain));
    };
    public isCruxDomainIdAvailable = (domainId: CruxDomainId): Promise<boolean> => {
        const result = this.domainById[domainId.toString()] !== undefined;
        return new Promise((resolve, reject) => resolve(result));
    };
    public get = (domainId: CruxDomainId): Promise<CruxDomain | undefined> => {
        const result = this.domainById[domainId.toString()];
        return new Promise((resolve, reject) => resolve(result));
    };
    public getWithConfigKeyManager = (keyManager: IKeyManager, domainId?: CruxDomainId): Promise<CruxDomain | undefined> => {
        throw Error("Not defined");
    };
    public save = (cruxDomain: CruxDomain, keyManager: IKeyManager): Promise<CruxDomain> => {
        if (this.domainById[cruxDomain.id.toString()] === undefined) {
            throw Error("No such domain exists");
        }
        this.domainById[cruxDomain.id.toString()] = cruxDomain;
        return new Promise((resolve, reject) => resolve(cruxDomain));
    };
}

export const addUserToRepo = async (cruxUser: CruxUser, repo: ICruxUserRepository, keyManager: IKeyManager) => {
    let createdCruxUser = await repo.create(cruxUser.cruxID.components.subdomain, keyManager);
    createdCruxUser.setAddressMap(cruxUser.getAddressMap());
    await repo.save(createdCruxUser, keyManager);
    return repo;
};

export const addDomainToRepo = async (cruxDomain: CruxDomain, repo: ICruxDomainRepository) => {
    // TODO: KeyManager is not used properly here to create domain
    let createdCruxDomain = await repo.create(cruxDomain.id, {} as any);
    createdCruxDomain.config = cruxDomain.config;
    await repo.save(cruxDomain, {} as any);
    return repo;
};

export const getValidCruxDomain = () => {
    const testCruxDomainId = CruxDomainId.fromString('somewallet.crux');
    const domainStatus: DomainRegistrationStatus = DomainRegistrationStatus.REGISTERED;
    const testValidDomainAssetMapping = {
        'bitcoin': 'd78c26f8-7c13-4909-bf62-57d7623f8ee8',
        'ethereum': '4e4d9982-3469-421b-ab60-2c0c2f05386a'
    };
    const testValidDomainConfig: IClientConfig = {
        assetMapping: testValidDomainAssetMapping,
        assetList: CruxSpec.globalAssetList.filter((asset) => Object.values(testValidDomainAssetMapping).includes(asset.assetId)),
        supportedAssetGroups: [],
    };
    return new CruxDomain(testCruxDomainId, domainStatus, testValidDomainConfig);
};
export const getCruxdevCruxDomain = () => {
    const testCruxDomainId = CruxDomainId.fromString('cruxdev.crux');
    const domainStatus: DomainRegistrationStatus = DomainRegistrationStatus.REGISTERED;
    const testValidDomainAssetMapping = {
        'bitcoin': 'd78c26f8-7c13-4909-bf62-57d7623f8ee8',
        'ethereum': '4e4d9982-3469-421b-ab60-2c0c2f05386a'
    };
    const testValidDomainConfig: IClientConfig = {
        assetMapping: testValidDomainAssetMapping,
        assetList: CruxSpec.globalAssetList.filter((asset) => Object.values(testValidDomainAssetMapping).includes(asset.assetId)),
        supportedAssetGroups: [],
    };
    return new CruxDomain(testCruxDomainId, domainStatus, testValidDomainConfig);
};
export const getValidCruxUser = () => {
    const testCruxUserSubdomain = "foo123";
    const testCruxId = CruxId.fromString('foo123@somewallet.crux');
    const testAddress: IAddress = {
        'addressHash': 'foobtcaddress'
    };
    const BTC_ASSET_ID: string = 'd78c26f8-7c13-4909-bf62-57d7623f8ee8';
    const testValidAddressMap: IAddressMapping = {[BTC_ASSET_ID]: testAddress};
    const validUserInformation: ICruxUserInformation = {
        registrationStatus: {
            'status': SubdomainRegistrationStatus.DONE,
            'statusDetail': SubdomainRegistrationStatusDetail.DONE,
        }
    };
    const validCruxUserData: ICruxUserData = {
        configuration: {
            enabledAssetGroups: [],
    }}

    return new CruxUser(testCruxUserSubdomain, getValidCruxDomain() , testValidAddressMap, validUserInformation, validCruxUserData);
};

export const getValidCruxUser2 = () => {
    const testCruxUserSubdomain = "bar123";
    const testCruxId = CruxId.fromString('bar123@somewallet.crux');
    const testAddress: IAddress = {
        'addressHash': 'foobtcaddress2'
    };
    const BTC_ASSET_ID: string = 'd78c26f8-7c13-4909-bf62-57d7623f8ee8';
    const testValidAddressMap: IAddressMapping = {[BTC_ASSET_ID]: testAddress};
    const validUserInformation: ICruxUserInformation = {
        registrationStatus: {
            'status': SubdomainRegistrationStatus.DONE,
            'statusDetail': SubdomainRegistrationStatusDetail.DONE,
        }
    };
    const validCruxUserData: ICruxUserData = {
        configuration: {
            enabledAssetGroups: [],
    }}

    return new CruxUser(testCruxUserSubdomain, getValidCruxDomain(), testValidAddressMap, validUserInformation, validCruxUserData);
};

export const getValidPendingCruxUser = () => {
    const testCruxUserSubdomain = "pending";
    const testCruxId = CruxId.fromString('pending@somewallet.crux');
    const validUserInformation: ICruxUserInformation = {
        registrationStatus: {
            'status': SubdomainRegistrationStatus.PENDING,
            'statusDetail': SubdomainRegistrationStatusDetail.PENDING_BLOCKCHAIN,
        }
    };
    const validCruxUserData: ICruxUserData = {
        configuration: {
            enabledAssetGroups: [],
    }}
    return new CruxUser(testCruxUserSubdomain, getValidCruxDomain(), {}, validUserInformation, validCruxUserData);
}

export const CustomMatcher = {
    ID: (expectedId: CruxId|CruxDomainId) => (actualId: CruxId|CruxDomainId) => actualId.toString() === expectedId.toString(),
}