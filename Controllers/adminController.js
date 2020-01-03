const universalFunctions = require("../universalFunction/functions")
let dataBaseService = require("../services/databaseServices")
let serviceProviderServices = require("../services/serviceProviderServices")
let { constant } = require('../config');
const boom = require('boom');
let moment = require('moment');
const bcrypt = require('bcrypt');

async function login(payload, remoteIp) {
    try {
        let serviceProvider = await serviceProviderServices.getServiceProvider(payload)
        if (serviceProvider && serviceProvider.length > 0) {
            serviceProvider = serviceProvider[0];
            const result = await bcrypt.compare(payload.password, serviceProvider.password);
            if (!result) {
                return boom.badRequest(constant.MESSAGE.EMAIL_PASSWORD_NOT_MATCH); //TODO
            }
            if (!serviceProvider.status) {
                return boom.badRequest(constant.MESSAGE.BLOCK_BY_ADMIN)
            }
            // await serviceProviderServices.clearUserSession({ id: serviceProvider.id, role: constant.ROLE.SERVICE_PROVIDER });
            let token = await serviceProviderServices.createToken({ id: serviceProvider.id, devideToken: payload.devideToken, role: constant.ROLE.SERVICE_PROVIDER, country: payload.country, permissions: serviceProvider.permissions, regions: serviceProvider.regions }, remoteIp);
            let user = {
                token: token,
                permissions: serviceProvider.permissions,
                hasAllAccess: serviceProvider.has_all_access ? true : false
            }
            return universalFunctions.sendSuccess({ data: { user } });
        }
        return boom.badRequest(constant.MESSAGE.USER_NOT_EXIST);

    } catch (e) {
        console.log(e);
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
        return boom.badRequest(e)
    }
}
async function getZone(payload) { //PROM
    try {
        let limit = constant.LIMIT;
        payload.pageNumber = payload.pageNumber;
        let connection = await dataBaseService.getConnection();
        let sql = `SELECT SQL_CALC_FOUND_ROWS
        zone.id,
        zone.name as name,
        cities.name AS cityName,
        mapAddress,
        st_x(location) as latitude,
        st_y(location) as longitude,
        cities.id AS city,
       time_format(ADDTIME('00:00:00', SEC_TO_TIME(serviceClosingTime*60)),'%I:%i %p') as serviceClosingTime,
       time_format(ADDTIME('00:00:00', SEC_TO_TIME(serviceOpeningTime*60)),'%I:%i %p') as serviceOpeningTime
    
    FROM
        zone
            LEFT JOIN
        cities ON cities.id = zone.city
            LEFT JOIN
        states ON cities.state_id = states.id
        where states.country_id = ? `
        let param = [101]
        if (payload.starttime) {
            sql += `  and serviceOpeningTime > ?`
            param.push(payload.starttime)
        }
        if (payload.endtime) {
            sql += `  and serviceClosingTime < ?`
            param.push(payload.endtime)
        }
        if (payload.name) {
            sql += `  and  zone.name like  concat(?,'%')`
            param.push(payload.name)
        }
        if (payload.pageNumber) {
            let skip = (payload.pageNumber - 1) * constant.LIMIT
            sql += ` group by zone.id limit ?,?`;
            param.push(skip, limit)
        }
        let data = await dataBaseService.runTransaction(sql, param, connection)
        let total = await dataBaseService.runTransaction('select FOUND_ROWS() as count', [], connection);
        total = total[0].count;
        connection.release();
        let pages = Math.ceil(total / limit)
        return universalFunctions.sendSuccess({ data: { region: data, total, pages, limit } })
    } catch (e) {
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
        return boom.badRequest(e)
    }
}


module.exports = {
    login,
    getZone
}