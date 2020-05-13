import * as chai from "chai";
import sinon from "sinon";
import chaiAsPromised from "chai-as-promised";
import 'mocha';
import {SecureCruxIdMessenger, CertificateManager, CruxConnectProtocolMessenger} from "../../core/domain-services";
import {ICruxUserRepository, IProtocolMessage, IPubSubClientFactory} from "../../core/interfaces";
import {BasicKeyManager, cruxPaymentProtocol} from "../../infrastructure/implementations";
import {InMemoryCruxUserRepository, MockUserStore, patchMissingDependencies} from "../test-utils";
import {InMemoryPubSubClientFactory, InMemoryMaliciousPubSubClientFactory} from "./inmemory-implementations";
import {getMockUserBar123CSTestWallet, getMockUserFoo123CSTestWallet, getMockUserFooBar123CSTestWallet} from "./utils";

patchMissingDependencies();

chai.use(chaiAsPromised);
chai.should();
const expect = require('chai').expect;



describe('Test Secure Crux Messenger', function() {
    beforeEach(async function() {
        const userStore = new MockUserStore();
        const user1Data = getMockUserFoo123CSTestWallet();
        const user2Data = getMockUserBar123CSTestWallet();
        const user3Data = getMockUserFooBar123CSTestWallet();
        this.user1Data = user1Data;
        this.user2Data = user2Data;
        this.user3Data = user3Data;
        userStore.store(user1Data.cruxUser);
        userStore.store(user2Data.cruxUser);
        const inmemUserRepo = new InMemoryCruxUserRepository(userStore);
        const pubsubClientFactory = new InMemoryPubSubClientFactory();
        const user1Messenger = new SecureCruxIdMessenger(inmemUserRepo, pubsubClientFactory, {
            cruxId: this.user1Data.cruxUser.cruxID,
            keyManager: new BasicKeyManager(this.user1Data.pvtKey)
        });
        const user2Messenger = new SecureCruxIdMessenger(inmemUserRepo, pubsubClientFactory, {
            cruxId: this.user2Data.cruxUser.cruxID,
            keyManager: new BasicKeyManager(this.user2Data.pvtKey)
        });
        this.user1PaymentProtocolMessenger = new CruxConnectProtocolMessenger(user1Messenger, cruxPaymentProtocol);
        this.user2PaymentProtocolMessenger = new CruxConnectProtocolMessenger(user2Messenger, cruxPaymentProtocol);

    });

    it('Can Send Valid Payment Request', async function() {
        return new Promise(async (res, rej) => {
            const validPaymentRequest = {
                amount: '1',
                assetId: '7c3baa3c-f5e8-490a-88a1-e0a052b7caa4',
                toAddress: 'randomAddress'
            }
            const testMessage: IProtocolMessage = {
                type: "PAYMENT_REQUEST",
                content: validPaymentRequest
            }
            this.user2PaymentProtocolMessenger.listen((msg: any)=>{
                expect(msg).to.deep.equal(testMessage);
                res()
            }, (err: any)=>{
                rej(err)
            });
            await this.user1PaymentProtocolMessenger.send(testMessage, this.user2Data.cruxUser.cruxID)
        });

    });

    it('Unable to send malformed payment request', async function() {
        const invalidPaymentRequest: IProtocolMessage = {
            type: "PAYMENT_REQUEST",
            content: {
                foo: 'bar'
            }
        };
        const promise = this.user1PaymentProtocolMessenger.send(invalidPaymentRequest, this.user2Data.cruxUser.cruxID)
        return expect(promise).to.be.eventually.rejected;

    });


})
