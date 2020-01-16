import 'mocha';
import sinon from "sinon";
import * as cwc from "../application/clients/crux-wallet-client";
import chaiAsPromised from "chai-as-promised";
import * as chai from "chai";

import {CruxWalletClient, ICruxIDState} from "../application/clients/crux-wallet-client";
import {SubdomainRegistrationStatus} from "../core/entities/crux-user";
import {BasicKeyManager} from "../infrastructure/implementations/basic-key-manager";
import {PackageErrorCode} from "../packages/error";
import {
    addDomainToRepo,
    addUserToRepo,
    getValidCruxDomain,
    getValidCruxUser, getValidCruxUser2,
    InMemoryCruxDomainRepository,
    InMemoryCruxUserRepository
} from "./test-utils";

chai.use(chaiAsPromised);
chai.should();
const expect = require('chai').expect;

const testCruxDomain = getValidCruxDomain();
const testCruxUser = getValidCruxUser();
const testCruxUser2 = getValidCruxUser2();
const testPvtKey = '6bd397dc89272e71165a0e7d197b280c7a88ed5b1e44e1928c25455506f1968f';  // 1HtFkbXFWHFW5Kd4GLfiRqkffS5KLZ91eJ
const testPvtKey2 = '12381ab829318742938647283cd462738462873642ef34abefcd123501827193'; // 1JoZwbjMnTmcpAyjjtRBfuqXAb2xiqZRjx

describe('CruxWalletClient Tests', function() {
    beforeEach(function() {
        this.inmemUserRepo = new InMemoryCruxUserRepository();
        this.inmemDomainRepo = new InMemoryCruxDomainRepository();
        addUserToRepo(testCruxUser, this.inmemUserRepo, new BasicKeyManager(testPvtKey));
        addUserToRepo(testCruxUser2, this.inmemUserRepo, new BasicKeyManager(testPvtKey2));
        addDomainToRepo(testCruxDomain, this.inmemDomainRepo);
        this.stubGetCruxDomainRepository = sinon.stub(cwc, 'getCruxDomainRepository').callsFake(() => this.inmemDomainRepo as any);
        this.stubGetCruxUserRepository = sinon.stub(cwc, 'getCruxUserRepository').callsFake(() => this.inmemUserRepo as any);
    });
    afterEach(function() {
        this.stubGetCruxUserRepository.restore();
        this.stubGetCruxDomainRepository.restore();
    });
    it('Nonexistent wallet name raises error', async function() {
        let cc = new CruxWalletClient({
            walletClientName: 'nonexistent'
        });
        const promise = cc.resolveCurrencyAddressForCruxID(testCruxUser.cruxID.toString(), 'bitcoin');
        return expect(promise).to.be.eventually.rejected.with.property('errorCode', PackageErrorCode.InvalidWalletClientName);
    });
    describe('Resolving a Users ID', function() {
        beforeEach(function() {
            this.cc = new CruxWalletClient({
                walletClientName: 'somewallet'
            });
        });
        it('Happy case - valid users address', async function() {
            const address = await this.cc.resolveCurrencyAddressForCruxID(testCruxUser.cruxID.toString(), 'bitcoin');
            await expect(address).to.have.property('addressHash').equals('foobtcaddress');
        });

        it('Invalid ID', async function() {
            const promise = this.cc.resolveCurrencyAddressForCruxID('lolwamax', 'bitcoin');
            await expect(promise).to.be.eventually.rejected.with.property('errorCode', PackageErrorCode.CruxIdInvalidStructure);
        });
        it('Wallet doesnt have asset id mapped', async function() {
            const promise = this.cc.resolveCurrencyAddressForCruxID(testCruxUser.cruxID.toString(), 'foo');
            await expect(promise).to.be.eventually.rejected.with.property('errorCode', PackageErrorCode.AssetIDNotAvailable);
        });
        it('User doesnt have a currency address', async function() {
            const promise = this.cc.resolveCurrencyAddressForCruxID(testCruxUser.cruxID.toString(), 'ethereum');
            await expect(promise).to.be.eventually.rejected.with.property('errorCode', PackageErrorCode.AddressNotAvailable);
        });
        it('ID is case insensitive', async function() {
            const address = await this.cc.resolveCurrencyAddressForCruxID('Foo123@testwallet.crux', 'bitcoin');
            await expect(address).to.have.property('addressHash').equals('foobtcaddress');
        });

    });

    describe('ID Availability check', function() {
        beforeEach(function() {
            this.cc = new CruxWalletClient({
                walletClientName: 'somewallet'
            });
        });
        it('Available ID check', async function() {
            expect(await this.cc.isCruxIDAvailable('random123')).equals(true);
        });
        it('Unavailable ID check', async function() {
            expect(await this.cc.isCruxIDAvailable(testCruxUser2.cruxID.components.subdomain)).equals(false);
        });
    });

    it('New ID Registration works properly', async function() {
        let cc = new CruxWalletClient({
            walletClientName: 'somewallet',
            privateKey: testPvtKey
        });
        const initIdState = await cc.getCruxIDState();
        expect(initIdState.cruxID).to.equals(null);

        await cc.registerCruxID('newtestuser');
        const idState = await cc.getCruxIDState();
        expect(idState.cruxID).equals('newtestuser@somewallet.crux');
        expect(idState.status.status).equals(SubdomainRegistrationStatus.PENDING);
    });

    describe('Client tests with private key of existing user', async function() {

        beforeEach(function() {
            this.cc = new CruxWalletClient({
                walletClientName: 'somewallet',
                privateKey: testPvtKey2
            });
        });

        it('User is recovered properly from private key', async function() {
            const idState: ICruxIDState = await this.cc.getCruxIDState();
            expect(idState.cruxID!.toString()).equals(testCruxUser2.cruxID.toString());
        });
        it('Cannot register because user is already registered', async function() {
            const registerPromise = this.cc.registerCruxID('anything')
            await expect(registerPromise).to.be.eventually.rejected.with.property('errorCode', PackageErrorCode.ExistingCruxIDFound);
        });
        it('New address addition works properly', async function() {
            const fetchedAddressMap1 = await this.cc.getAddressMap();
            expect(fetchedAddressMap1['bitcoin']['addressHash']).equals('foobtcaddress2');

            const newAddressMap = {'bitcoin': {'addressHash': 'btcAddressXyz'}};
            await this.cc.putAddressMap(newAddressMap);
            const fetchedAddressMap2 = await this.cc.getAddressMap();
            expect(fetchedAddressMap2['bitcoin']['addressHash']).equals(newAddressMap['bitcoin']['addressHash']);

        });
        it('Partial publishing of addresses works', async function() {

            const fetchedAddressMap1 = await this.cc.getAddressMap();
            expect(fetchedAddressMap1['bitcoin']['addressHash']).equals('foobtcaddress2');

            const newAddressMap = {'bitcoin': {'addressHash': 'btcAddressAbc'}, 'invalidsymbol': {'addressHash': 'someRandomAddress'}};
            const putResult = await this.cc.putAddressMap(newAddressMap);
            expect(putResult.success).hasOwnProperty('bitcoin');
            expect(putResult.failures).hasOwnProperty('invalidsymbol');

            const fetchedAddressMap2 = await this.cc.getAddressMap();
            expect(fetchedAddressMap2['bitcoin']['addressHash']).equals(newAddressMap['bitcoin']['addressHash']);
        });
    });

});
