'use strict'

const { constant } = require('../config');
var PATTERN = /^(.)|\s+(.)/g;

module.exports = {
    // To parse the string to json object
    jsonParse(data) {
        try {
            return JSON.parse(data);
            console.log(data)
        } catch (error) {

            return [];
        }
    },
    //To send the success response to the client with statusCode 200, message and data
    sendSuccess(message) {
        let data = {};
        data.statusCode = message.statusCode || 200;
        data.message = message.message || 'success';
        data.data = message.data || {};
        return data;
    },
    // To send the errors to the client 
    sendExceptions(exceptions, message) {

        if (process.env.NODE_ENV == 'lives') {
            exceptions.isCatch = true
            exceptions.message = message || constant.MESSAGE.SOMETHING_WENT_WRONG
        }

        return exceptions
    },
    ucwords(str) {

        return (str + '').replace(PATTERN, function(match) {
            return match.toUpperCase();
        });
    },
    failActionFunction(request, reply, error) {
        let customErrorMessage = '';
        // console.log(typeof request.payload.eventEndTime)
        if (error.output.payload.message.indexOf('[') > -1) {
            customErrorMessage = error.output.payload.message.substr(error.output.payload.message.indexOf('['));
        } else {
            customErrorMessage = error.output.payload.message;
        }
        // request.logs =  reply.customError || []
        customErrorMessage = customErrorMessage.replace(/"/g, '');
        customErrorMessage = customErrorMessage.replace('[', '');
        customErrorMessage = customErrorMessage.replace(']', '');
        error.output.payload.message = customErrorMessage;
        // error.output.payload.details = error.details
        error.output.payload.error = 'Validation Error'
        delete error.output.payload.validation;
        request.logs.push(error)
        return error;
    }

}