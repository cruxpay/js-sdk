import {createNanoEvents} from "nanoevents";
import {CruxGateway} from "../../core/entities";
import {
    ICruxGatewayRepository,
    IGatewayIdentityClaim,
    IGatewayProtocolHandler,
    IPubSubProvider
} from "../../core/interfaces";
import {
    CruxGatewayPaymentsProtocolHandler,
    getProtocolHandler
} from "../../infrastructure/implementations";

export class BasicGatewayProtocolHandler implements IGatewayProtocolHandler {
    public getName(): string {
        return "BASIC";
    }

    public validateMessage(gatewayMessage: any): boolean {
        return true;
    }
}

export class InMemoryPubSubProvider implements IPubSubProvider {
    private emitterByTopic: any;
    constructor(){
        this.emitterByTopic = {}
    }
    public publish(topic: string, data: any): void {
        let topicEmitter = this.getEmitter(topic);
        topicEmitter.emit('message', data)
    };
    public subscribe(topic: string, callback: any): void {
        let topicEmitter = this.getEmitter(topic);
        topicEmitter.on('message', callback)
    };
    private getEmitter(topic: string) {
        let topicEmitter = this.emitterByTopic[topic];
        if (!topicEmitter) {
            topicEmitter = createNanoEvents();
            this.emitterByTopic[topic] = topicEmitter;
        }
        return topicEmitter
    }
}

export class InMemoryCruxGatewayRepository implements ICruxGatewayRepository {
    private pubsubProvider: InMemoryPubSubProvider;
    private supportedProtocols: any;
    constructor(){
        this.pubsubProvider = new InMemoryPubSubProvider();
        this.supportedProtocols = [ BasicGatewayProtocolHandler, CruxGatewayPaymentsProtocolHandler ];
    }
    public openGateway(protocol: string, selfClaim?: IGatewayIdentityClaim): CruxGateway {
        const protocolHandler = getProtocolHandler(this.supportedProtocols, protocol);
        return new CruxGateway(this.pubsubProvider, protocolHandler, selfClaim);
    }

}
