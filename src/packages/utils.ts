import request from "request";
import { getLogger } from "../index";

const log = getLogger(__filename);

const httpJSONRequest = (options: (request.UriOptions & request.CoreOptions) | (request.UrlOptions & request.CoreOptions)): Promise<object> => {
    /* istanbul ignore next */
    const promise: Promise<object> = new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (error) { reject(new Error(error)); }
            // log.debug(response)
            resolve(body);
        });
    });
    return promise;
};

export {
    httpJSONRequest,
};
