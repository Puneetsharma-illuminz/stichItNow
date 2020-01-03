const boom = require('boom');
const bcrypt = require('bcrypt');

const request = require('request');

const { userServices } = require("../services");

const universalFunctions = require("../universalFunction/functions");
const { constant } = require('../config');


let dataBaseService = require("../services/databaseServices");

async function userExist(query) {
    try {
        //TODO() 
        let email = await dataBaseService.executeQuery('select * from users where (phoneNumber = ? or email = ?) or email = ?', [query.phoneNumber, query.countryCode, query.email]);
        console.log(email);
        if (email && email.length > 0) {
            return boom.badRequest(constant.MESSAGE.USER_ALLREADY_EXIST);
        }
        return universalFunctions.sendSuccess({});
    } catch (e) {
        console.log(e);

        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG);
        return boom.badRequest(e);
    }
}
async function sendEditPhoneVerificationCode(payload, user, lang) {
    try {
        let verificationCode = 1111
        if (process.env.USER_LIVE != 0) {
            verificationCode = rand()
            let messageData = {}
            messageData.message = constant.SMS_TEXT.phoneEdit.replace('{}', verificationCode)
            let number = payload.countryCode + payload.phoneNumber
                // fcmNotification.sendMessage(messageData, number)
        }
        await dataBaseService.executeQuery('update users set phone_update_token =? where id =?', [verificationCode, user.userId])
        return universalFunctions.sendSuccess({})
    } catch (e) {
        console.log(e);
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG);
        return boom.badRequest(e);
    }
}
async function signUp(payload, lang, remoteIp) {
    try {
        if (payload.referralCode) {
            let referral = await dataBaseService.executeQuery(`select id from users where referral_code = ?`, [payload.referralCode])
            if (referral && referral.length == 0) {
                return boom.badRequest(constant.MESSAGE.INVALID_REFERRAL)
            }
        }
        let ver = await dataBaseService.executeQuery('select * from verify_user where phoneNumber =? and token = ? ', [payload.phoneNumber, payload.verificationCode])
        if (ver && ver.length > 0) {

        } else {
            return boom.badRequest(constant.MESSAGE.NOT_VERIFIED)
        }
        let password = await bcrypt.hash(payload.password, 10);
        let customer = await dataBaseService.executeQuery(`insert into users (full_name,email,password,phoneNumber,country_code,referral_to_use) values(?,?,?,?,?,?)`, [payload.fullName, payload.email, password, payload.phoneNumber, payload.countryCode, payload.referralCode]);
        await dataBaseService.executeQuery(`update users set unique_id = ?,referral_code =concat(REPLACE(UPPER(SUBSTRING(?,1,4)),' ','-'),'-',id) where id = ?`, [customer.insertId.toString().padStart(8, 0), payload.fullName, customer.insertId])
        let token = await userServices.createToken({ id: customer.insertId, deviceToken: payload.deviceToken, role: constant.ROLE.USER }, remoteIp);
        let user = await userServices.getUser(payload);
        if (user && user.length > 0) {
            user = user[0]
            user.address = universalFunctions.jsonParse(user.address);
            user.image = universalFunctions.jsonParse(user.image);

            if (user.address && user.address.length > 0) {
                for (let i = 0; i < user.address.length; i++) {
                    if (user.address[i].id == null) {
                        user.address = [];
                        break;
                    }
                    user.address[i].type = constant.ADDRESS_TYPE_REV[user.address[i].type];
                }
            } else {
                user.address = []
            }
            if (user.password) {
                user.showChangePassword = 1
            } else {
                user.showChangePassword = 0
            }
            delete user.password;
            delete user.id
            user.token = token
        }
        let templateData = {
            name: universalFunctions.ucwords(payload.fullName),
        }

        // emailNotification.sendNotification({ type: constant.EMAIL_TYPE.FOR_REGISTRATION, isEmail: true, html: handlebars.compile(registrationTemplate)(templateData) }, { email: payload.email })
        return universalFunctions.sendSuccess({ data: user });


    } catch (e) {
        console.log(e);
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
        return boom.badRequest(e)
    }
}
async function verifyUserEmail(phoneNumber, email, country) {
    try {
        // await dataBaseService.executeQuery(`select id from users where (phoneNumber =? and  country_code = ?) or email = ?`, [phoneNumber, country, email])  
        let user = await dataBaseService.executeQuery(
            `select * from  users where phoneNumber =? and  country_code = ?`, [phoneNumber, country])
        let userEmail = await dataBaseService.executeQuery(
            `select * from  users where email = ?`, [email])
        if ((user && user.length > 0) || (userEmail && userEmail.length > 0)) {
            if ((user && user.length > 0)) {
                return { messageData: constant.MESSAGE.PHONE_NUMBER_EXIST }
            }
            if (userEmail && userEmail.length > 0) {
                return { messageData: constant.MESSAGE.EMAIL_EXIST }
            }

        }
    } catch (e) {
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG);
        return boom.badRequest(e);
    }
}
async function userLogout(payload, user) {
    try {
        await userServices.clearUserSession({ id: user.userId, role: constant.ROLE.USER })
        return universalFunctions.sendSuccess({});
    } catch (e) {
        console.log(e);
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG);
        return boom.badRequest(e);
    }
}
async function forgotPassword(payload, lang) {
    try {
        let user = await dataBaseService.executeQuery('select * from users where phoneNumber = ? and country_code = ?', [payload.phoneNumber, payload.countryCode])
        if (user && user.length > 0) {
            if (user[0].phone_update_token == payload.verificationCode) {
                let password = await bcrypt.hash(payload.password, 10);
                await dataBaseService.executeQuery('update users set password = ?,phone_update_token =?  where id = ? ', [password, null, user[0].id])
                return universalFunctions.sendSuccess({})
            }
            return boom.badRequest(constant.MESSAGE.INVALID_VERIFICATION)
        }
        return boom.badRequest(constant.MESSAGE.USER_NOT_EXIST)
    } catch (e) {
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG);
        return boom.badRequest(e);
    }
}
async function verifyUsers(payload) {
    try {
        let unique = 1111
            // if (process.env.USER_LIV != 0) {
            //     unique = rand()
            //     let messageData = {}
            //     messageData.message = constant.SMS_TEXT.verifyUser.replace('{}', unique)
            //     let number = payload.countryCode + payload.phoneNumber
            //     //fcmNotification.sendMessage(messageData, number)
            // } 
        let data = await dataBaseService.executeQuery(`INSERT INTO verify_user (phoneNumber,token) VALUES(?,?) ON DUPLICATE KEY UPDATE token = ? `, [payload.phoneNumber, unique, unique])
            // fcmNotification.sendMessage(messageData,payload.countryCode+payload.phoneNumber,{userId:data.insertId})
        return universalFunctions.sendSuccess({});
    } catch (e) {
        console.log(e)
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG);
        return boom.badRequest(e);
    }
}
async function sendForgotPasswordVerificationCode(payload, lang) {
    try {
        let unique = 1111 // rand();
            // console.log('----------',process.env.USER_LIVE);
        if (process.env.USER_LIVE) {
            unique = rand()
            let messageData = {}
            messageData.message = constant.SMS_TEXT.forgotPassword.replace('{}', unique)
            let number = payload.countryCode + payload.phoneNumber
            fcmNotification.sendMessage(messageData, number)
        }

        console.log(payload);
        let user = await dataBaseService.executeQuery('select * from users where phoneNumber = ? and country_code = ?', [payload.phoneNumber, payload.countryCode])
        console.log("user", user);
        if (user && user.length > 0) {
            await dataBaseService.executeQuery('update users set phone_update_token =? where id =?', [unique, user[0].id])

            return universalFunctions.sendSuccess({})
        }
        return boom.badRequest(constant.MESSAGE.USER_NOT_EXIST)

    } catch (e) {
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG);
        return boom.badRequest(e);
    }
}

async function login(payload, remoteIp, devicetype) {
    try {
        let user = await userServices.getUser(payload)
        if (user && user.length > 0 && user[0].id != null) {
            user = user[0];
            if (!user.is_active) {
                return boom.badRequest(constant.MESSAGE.BLOCK_BY_ADMIN)
            }
            user.address = universalFunctions.jsonParse(user.address);
            user.image = universalFunctions.jsonParse(user.image);
            if (user.address && user.address.length > 0) {
                for (let i = 0; i < user.address.length; i++) {
                    if (user.address[i].id == null) {
                        user.address = [];
                        break;
                    }
                    user.address[i].type = constant.ADDRESS_TYPE_REV[user.address[i].type];
                }
            } else {
                user.address = []
            }
            if (!user.password) {
                return boom.badRequest();
            }
            const result = await bcrypt.compare(payload.password, user.password);
            if (!result) {
                return boom.badRequest(constant.MESSAGE.PHONE_PASSWORD_NOT_MATCH); //TODO
            }
            await userServices.clearUserSession({ id: user.id, role: constant.ROLE.USER });
            let token = await userServices.createToken({ id: user.id, deviceToken: payload.deviceToken, role: constant.ROLE.USER, devicetype: devicetype, isMerchant: user.isMerchant }, remoteIp);
            if (user.password) {
                user.showChangePassword = 1
            } else {
                user.showChangePassword = 0
            }
            delete user.password;
            delete user.id
            user.token = token
            return universalFunctions.sendSuccess({ data: user });
        }
        return boom.badRequest(constant.MESSAGE.USER_NOT_EXIST);
    } catch (e) {
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG);
        return boom.badRequest(e);
    }
}

async function socialLogin(payload) {
    try {
        if (payload.referralCode) {
            let referral = await dataBaseService.executeQuery(`select id from users where referral_code = ?`, [payload.referralCode])
            if (referral && referral.length == 0) {
                return boom.badRequest(constant.MESSAGE.INVALID_REFERRAL)
            }
        }
        let data = await dataBaseService.executeQuery(`SELECT user_id FROM customer_social_login WHERE social_type = ? && social_id = ? `, [payload.socialType, payload.socialID])
        if (data && data.length > 0) {
            data = data[0];
            payload.userId = data.user_id
            return await insertSocial({ id: data.user_id }, payload, false);
        }
        let userEmail = await dataBaseService.executeQuery(
            `select * from  users where email = ?`, [payload.email])
        if (userEmail && userEmail.length > 0) {
            return boom.badRequest(constant.MESSAGE.EMAIL_EXIST)
                // await dataBaseService.executequery('insert IGNORE into customer_social_login (user_id,social_type,social_id)  values (?,?,?)', [userEmail[0].id, payload.socialType,payload.socialID])
                // return await insertSocial({ id: userEmail[0].id }, payload, false);
        }
        if (!payload.phoneNumber) {
            let e = boom.badRequest(constant.MESSAGE.USER_NOT_EXIST)
            e.output.statusCode = 499; // Assign a custom error code
            e.reformat();
            return e
        }
        if (payload.phoneNumber && payload.verificationCode) {
            let ver = await dataBaseService.executeQuery('select * from verify_user where phoneNumber =? and token = ? ', [payload.phoneNumber, payload.verificationCode])
            if (ver && ver.length > 0) {

            } else {
                return boom.badRequest(constant.MESSAGE.NOT_VERIFIED)
            }
        }
        let user = await dataBaseService.executeQuery(
            `select * from  users where phoneNumber = ?`, [payload.phoneNumber])

        if ((user && user.length > 0) || (userEmail && userEmail.length > 0)) {
            if ((user && user.length > 0)) {
                return boom.badRequest(constant.MESSAGE.PHONE_NUMBER_EXIST)
            }

        } else {
            let data = await verifySotialLogin(payload)
            if (data) {
                let customer = await dataBaseService.executeQuery(`insert into users (full_name,email,phoneNumber,country_code,referral_to_use) values(?,?,?,?,?)`, [payload.fullName, payload.email, payload.phoneNumber, payload.countryCode, payload.referralCode]);
                await dataBaseService.executeQuery(`update users set unique_id = ?,referral_code = concat(REPLACE(UPPER(SUBSTRING(?,1,4)),' ','-'),'-',id)  where id = ?`, [customer.insertId.toString().padStart(8, 0), payload.fullName, customer.insertId])
                    // await dataBaseService.executequery('insert into customer_social_login (user_id,social_type,social_id)  values (?,?,?)',[customer.insertId,payload.socialType,
                    //     payload.socialID])
                return await insertSocial({ id: customer.insertId }, payload, true);
            } else {
                return boom.badRequest(constant.MESSAGE.NOT_VERIFIED)
            }
        }

    } catch (e) {
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG);
        return boom.badRequest(e);
    }
}
async function verifySotialLogin(payloads) {
    try {
        switch (payloads.socialType) {
            case constant.SOCIAL_LOGIN.facebook:
                {
                    let url = `https://graph.facebook.com/v2.10/me?access_token=` + payloads.accessToken
                    return new Promise((resolve, reject) => {
                        request.get(url, (error, response, body) => {
                            if (!(response.statusCode < 300 && response.statusCode >= 200)) {
                                return resolve(false)
                            }
                            return resolve(true);
                        })

                    });
                }
            case constant.SOCIAL_LOGIN.google:
                {
                    let url = `https://oauth2.googleapis.com/tokeninfo?id_token=` + payloads.accessToken
                    return new Promise((resolve, reject) => {
                        request.get(url, (error, response, body) => {
                            if (!(response.statusCode < 300 && response.statusCode >= 200)) {
                                return resolve(false)
                            }
                            return resolve(true);
                        })

                    });
                    break
                }
            default:
                {
                    return false
                }
        }
    } catch (e) {
        throw e;
    }
}
async function insertSocial(users, payload, cases) {
    try {
        if (cases) {
            await dataBaseService.executeQuery('insert IGNORE into customer_social_login (user_id,social_type,social_id)  values (?,?,?)', [users.id, payload.socialType,
                payload.socialID
            ])
            let templateData = {
                name: universalFunctions.ucwords(payload.fullName),
            }

            // emailNotification.sendNotification({ type: constant.EMAIL_TYPE.FOR_REGISTRATION, isEmail: true, html: handlebars.compile(registrationTemplate)(templateData) }, { email: payload.email })
        }
        await userServices.clearUserSession({ id: users.id, role: constant.ROLE.USER })
        let token = await userServices.createToken({ id: users.id, deviceToken: payload.deviceToken, role: constant.ROLE.USER, devicetype: payload.devicetype });
        let user = await userServices.getUser({ userId: users.id });
        user.image = universalFunctions.jsonParse(user.image);
        if (user && user.length > 0 && user[0].id != null) {
            user = user[0]
            user.address = universalFunctions.jsonParse(user.address);
            user.image = universalFunctions.jsonParse(user.image);
            if (user.address && user.address.length > 0) {
                for (let i = 0; i < user.address.length; i++) {
                    if (user.address[i].id == null) {
                        user.address = [];
                        break;
                    }
                    user.address[i].type = constant.ADDRESS_TYPE_REV[user.address[i].type];
                }
            } else {
                user.address = []
            }
            if (user.password) {
                user.showChangePassword = 1
            } else {
                user.showChangePassword = 0
            }
            delete user.password;
            delete user.id
            user.token = token
        }
        return universalFunctions.sendSuccess({ data: user });
    } catch (e) {
        throw e;
    }
}

async function addAddress(payload, lang, user) {
    try {
        let data;
        let zone = await dataBaseService.executeQuery(`select id from zone WHERE  st_contains(region,POINT(?,?)) limit 1`, [payload.userLatitude, payload.userLongitude])
        zone = zone[0] ? zone[0].id : null
        if (!zone) {
            return boom.badRequest(constant.MESSAGE.NOT_IN_SAME_REGION)
        }
        if (!payload.addressId) {
            let param = [user.userId, payload.address, payload.houseNumber, payload.landMark, constant.ADDRESS_TYPE[payload.type], payload.otherText, zone, payload.buildingName]
            let sql = `insert into customer_address (user_id, address,house_number,land_mark,type,other_text,zone_id,building_name`
            if (payload.userLatitude && payload.userLongitude) {
                sql += ',location';
                param.push(payload.userLatitude, payload.userLongitude);
            }
            sql += `) values (?,?,?,?,?,?,?,?`
            if (payload.userLatitude && payload.userLongitude) {
                sql += ' ,St_geomfromtext(\'POINT(? ?)\',4326) ';
                param.push(payload.userLatitude, payload.userLongitude);
            }
            sql += `)`
            data = await dataBaseService.executeQuery(sql, param);
        } else {
            let param = [payload.address, payload.houseNumber, payload.landMark, constant.ADDRESS_TYPE[payload.type], payload.otherText, zone, payload.buildingName];
            let sql = `update customer_address set address = ?, house_number=?, land_mark=?,type =? , other_text=?,zone_id =? ,building_name=?`
            if (payload.userLatitude && payload.userLongitude) {
                sql += ',location = St_geomfromtext(\'POINT(? ?)\',4326)';
                param.push(payload.userLatitude, payload.userLongitude);
            }
            // [payload.addressId,user.userId]
            sql += ` where id =? and user_id = ?`
            param.push(payload.addressId, user.userId)

            await dataBaseService.executeQuery(sql, param)
        }

        let dataToSend = await userServices.getAddress(payload.addressId || data.insertId);
        if (dataToSend && dataToSend.length > 0) {
            dataToSend[0].type = constant.ADDRESS_TYPE_REV[dataToSend[0].type]
            return universalFunctions.sendSuccess({ data: { address: dataToSend[0] } })
        }
        return boom.badRequest(constant.MESSAGE.SOMETHING_WENT_WRONG);
    } catch (e) {
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG);
        return boom.badRequest(e);
    }
}

async function getCategories(payload, lang, user) {
    // SELECT type JSON_ARRAYAGG(name) AS Categories 
    //    FROM categories GROUP BY type
    //     let categories = await dataBaseService.executeQuery(`SELECT 
    //     type,
    //     JSON_ARRAYAGG(JSON_OBJECT('id', id, 'name', name)) AS Categories
    // FROM
    //     categories
    // GROUP BY type`)

    try {


        let categories = await dataBaseService.executeQuery(`SELECT  id, name from categories`)

        if (!categories && categories.length == 0) {

            return { messageData: constant.MESSAGE.NO_CATEGORY }
        }

        return universalFunctions.sendSuccess({
            data: {
                categories: categories
            }
        });

    } catch (e) {
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG);
        return boom.badRequest(e);
    }

    //let categories = await dataBaseService.executeQuery(`SELECT  id, name from categories`)


    // categories.map((category)=>{
    //        category.Categories =  JSON.parse( category.Categories)
    //     return category;
    // })
    //return categories

}

async function getCategoriesAndVehicleInfo(payload, lang, user) {


    try {


        let categories = await dataBaseService.executeQuery(`SELECT  id, name from categories`)

        if (!categories && categories.length == 0) {

            return { messageData: constant.MESSAGE.NO_CATEGORY }
        }

        let vehilcesInfo = await dataBaseService.executeQuery(`SELECT  
        JSON_ARRAYAGG(vehicle_info.description) AS description,vehicles.type AS vehicleType,vehicles.packageDimensions AS size,vehicles.perKilometerCharge AS baseFare, vehicles.minCapacity AS capacity
     FROM
         vehicles
             LEFT JOIN
         vehicle_info ON vehicles.type = vehicle_info.vehicleId
       GROUP BY vehicles.type `)

        vehilcesInfo.map(vehicle => {
            vehicle.description = JSON.parse(vehicle.description)
            return vehicle;
        });

        return universalFunctions.sendSuccess({
            data: {
                categories: categories,
                vehicles: vehilcesInfo
            }
        });

    } catch (e) {
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG);
        return boom.badRequest(e);
    }



}

async function calculateDistance(payload) {
    let newPayload = {...payload };
    // console.log(newPayload);
    const distanceAndTimeOfLatLong = await getGoogleResponce(`${newPayload.origin.lat},${newPayload.origin.lng}`, `${newPayload.destination.lat},${newPayload.destination.lng}`);
    newPayload.distance = distanceAndTimeOfLatLong.routes[0].legs[0].distance;
    newPayload.duration = distanceAndTimeOfLatLong.routes[0].legs[0].duration;
    // calculate  price 


    let selectedVehiclePrice = await dataBaseService.executeQuery('SELECT perKilometerCharge from vehicles where type = ?  ', [payload.vehicleType])

    newPayload.selectedCategoriesId = await dataBaseService.executeQuery('SELECT  id, name from categories WHERE id IN (?)  ', [payload.selectedCategoriesId])
    console.log(newPayload);
    //let price = parseFloat(distanceAndTimeOfLatLong.routes[0].legs[0].distance.text);
    //newPayload.price = parseFloat(distanceAndTimeOfLatLong.routes[0].legs[0].distance.text) * selectedVehiclePrice[0].perKilometerCharge;
    newPayload.price = parseFloat((distanceAndTimeOfLatLong.routes[0].legs[0].distance.value / 1000).toFixed(1)) * selectedVehiclePrice[0].perKilometerCharge;

    //  console.log(price);
    return universalFunctions.sendSuccess({
        data: newPayload
    });
}

async function getVehicles() {


    try {


        let categories = await dataBaseService.executeQuery(`SELECT  id, name from categories`)
        if (!categories && categories.length == 0) {

            return { messageData: constant.MESSAGE.NO_CATEGORY }
        }

        return universalFunctions.sendSuccess({
            data: {
                categories: categories
            }
        });

    } catch (e) {
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG);
        return boom.badRequest(e);
    }

}

async function getGoogleResponce(origin, destination) {
    try {
        var options = {
            method: 'GET',
            url: 'https://maps.googleapis.com/maps/api/directions/json?',
            headers: { 'Content-Type': 'application/json' }
        };
        return new Promise((resolve, reject) => {
            options.qs = {
                key: "AIzaSyBq9xeQipVe5delt99v680lP6NLkfwOytg",
                travelMode: 'DRIVING',
                origin: origin,
                destination: destination,
            }
            request(options, function(error, response, body) {
                // console.log('google response', JSON.stringify(body))
                let bodyParse = JSON.parse(body)

                return resolve(bodyParse);
            });
        });

    } catch (e) {
        throw e
    }
}
module.exports = {
    userExist,
    sendEditPhoneVerificationCode,
    signUp,
    verifyUserEmail,
    verifyUsers,
    login,
    forgotPassword,
    sendForgotPasswordVerificationCode,
    userLogout,
    socialLogin,
    insertSocial,
    addAddress,
    getCategories,
    getCategoriesAndVehicleInfo,
    calculateDistance

}