import * as chai from "chai";
import sinon from "sinon";
import chaiAsPromised from "chai-as-promised";
import 'mocha';
import {SecureCruxIdMessenger, CertificateManager} from "../../core/domain-services";
import {BasicKeyManager} from "../../infrastructure/implementations";
import {InMemoryCruxUserRepository, MockUserStore, patchMissingDependencies} from "../test-utils";
import {InMemoryPubSubClientFactory} from "./inmemory-implementations";
import {getMockUserBar123CSTestWallet, getMockUserFoo123CSTestWallet} from "./utils";

patchMissingDependencies();

chai.use(chaiAsPromised);
chai.should();
const expect = require('chai').expect;


describe('Test Secure Crux Messenger', function() {
    beforeEach(async function() {
        const userStore = new MockUserStore();
        const user1Data = getMockUserFoo123CSTestWallet();
        const user2Data = getMockUserBar123CSTestWallet();
        this.user1Data = user1Data;
        this.user2Data = user2Data;
        userStore.store(user1Data.cruxUser);
        userStore.store(user2Data.cruxUser);
        this.inmemUserRepo = new InMemoryCruxUserRepository(userStore);
        this.pubsubClientFactory = new InMemoryPubSubClientFactory();
    });

    it('Basic Send Receive Test', async function() {
        const testmsg = 'HelloWorld';
        return new Promise(async (resolve, reject) => {
            const user1Messenger = new SecureCruxIdMessenger(this.inmemUserRepo, this.pubsubClientFactory, {
                cruxId: this.user1Data.cruxUser.cruxID,
                keyManager: new BasicKeyManager(this.user1Data.pvtKey)
            });

            const user2Messenger = new SecureCruxIdMessenger(this.inmemUserRepo, this.pubsubClientFactory, {
                cruxId: this.user2Data.cruxUser.cruxID,
                keyManager: new BasicKeyManager(this.user2Data.pvtKey)
            });
            user2Messenger.listen((msg) => {
                resolve(msg)
            },(err) => {
                reject(err)
            });
            await user1Messenger.send(testmsg, this.user2Data.cruxUser.cruxID);
        }).then(msg => 
            expect(msg).equals(testmsg)
        );

    });

    describe('Certificate Tests', function() {

        it('Invalid Certificate Send Receive Test with Wrong Private Key', async function() {

            const testmsg = "HelloWorld"
            return new Promise(async (resolve, reject) => {
                const user1Messenger = new SecureCruxIdMessenger(this.inmemUserRepo, this.pubsubClientFactory, {
                    cruxId: this.user1Data.cruxUser.cruxID,
                    keyManager: new BasicKeyManager(this.user2Data.pvtKey)
                });

                const user2Messenger = new SecureCruxIdMessenger(this.inmemUserRepo, this.pubsubClientFactory, {
                    cruxId: this.user2Data.cruxUser.cruxID,
                    keyManager: new BasicKeyManager(this.user2Data.pvtKey)
                });
                user2Messenger.listen((msg) => {
                    resolve(msg)
                },(err) => {
                    reject(err)
                });
                await user1Messenger.send(testmsg, this.user2Data.cruxUser.cruxID);
            }).catch(
                err => expect(err).to.be.an('error')
            );

        });
    });
    describe('Certificate Tests with Fake Certificate', function() {

        beforeEach(async function() {
            const testInvalidCertificate = {
                claim: this.user2Data.cruxUser.cruxID.toString(),
                proof: "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NksifQ.eyJtZXNzYWdlSWQiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAifQ.iaa0Y9mPDBv8V_fVMRrJuqRyYcVvHYqbZcTGWFrDSwezJt6R7NQbHoA36fq0av51Q2LKJsQJHAwMfc-ph806fA"
            };
            this.stubMakeCertificate = sinon.stub(CertificateManager, 'make').callsFake(() => testInvalidCertificate as any);
        });
        afterEach(function() {
            this.stubMakeCertificate.restore();
        });
        it('Invalid Certificate Send Receive Test with Fake Certificate', async function() {

            const testmsg = "HelloWorld"
            return new Promise(async (resolve, reject) => {
                const user1Messenger = new SecureCruxIdMessenger(this.inmemUserRepo, this.pubsubClientFactory, {
                    cruxId: this.user1Data.cruxUser.cruxID,
                    keyManager: new BasicKeyManager(this.user1Data.pvtKey)
                });

                const user2Messenger = new SecureCruxIdMessenger(this.inmemUserRepo, this.pubsubClientFactory, {
                    cruxId: this.user2Data.cruxUser.cruxID,
                    keyManager: new BasicKeyManager(this.user2Data.pvtKey)
                });
                user2Messenger.listen((msg) => {
                    resolve(msg)
                },(err) => {
                    reject(err)
                });
                await user1Messenger.send(testmsg, this.user2Data.cruxUser.cruxID);
            }).catch(
                err => expect(err).to.be.an('error')
            );

        });
    });

})