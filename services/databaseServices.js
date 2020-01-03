let config = require('../config');
const universalFunctions = require("../universalFunction/functions");
let { constant } = require('../config');
const Jwt = require('jsonwebtoken');
const boom = require('boom');
const connection = config.connection;
async function executeQuery(query, parems) {
    return new Promise((resolve, reject) => {
        let quer = connection.query(query, parems, (err, result) => {
            //  console.log('sql----->>>>', JSON.stringify(quer.sql.replace(/(\r\n\t|\n|\r\t)/gm, "")));
            if (err) {
                console.log(err);
                err = universalFunctions.sendExceptions(err, '')
                reject(err);
            }
            resolve(result);
        });
    });
}

async function getConnection() {
    return new Promise((resolve, reject) => {
        connection.getConnection(function(err, con) {
            if (err) {
                err = universalFunctions.sendExceptions(err, '')
                reject(err)
            }

            return resolve(con)
        })
    })
}
async function runTransaction(query, params, con) {
    return new Promise((resolve, reject) => {
        let quer = con.query(query, params, (err, result) => {
            console.log('sql----->>>>', quer.sql);
            if (err) {
                // connection.rollback(function() {
                err = universalFunctions.sendExceptions(err, '')
                    // con.release();
                reject(err);
                //   });

            }
            resolve(result);
        });
    });
}
async function compleTransaction(query, params, con) {
    try {
        return new Promise((resolve, reject) => {
            con.commit((err, result) => {
                if (err) {
                    // connection.rollback(function() {
                    console.log(err);
                    err = universalFunctions.sendExceptions(err, '')
                    reject(err);
                    //   });

                }
                resolve();
            });
        });
    } catch (e) {
        console.log(e)
        throw e
    }
}
async function verifyToken(token) {
    try {
        let decodedToken = Jwt.verify(token, constant.JWT_SECRET);
        console.log("--------", decodedToken);
        let result = await sessionExist(decodedToken.sessionId);
        console.log(decodedToken);
        if (!result) {
            throw boom.unauthorized(constant.MESSAGE.bad_token);
        }

        return decodedToken;
    } catch (e) {
        console.log(e);
        throw boom.badRequest(e);

    }
}
async function sessionExist(sessionId) {
    try {
        let session = await executeQuery('select * from user_session where id = ?', [sessionId]);
        if (session && session.length > 0) {
            return true;
        }
        return false;
    } catch (e) {
        throw boom.badRequest(e);
    }
}

module.exports = {
    executeQuery,
    getConnection,
    runTransaction,
    compleTransaction,
    verifyToken
};