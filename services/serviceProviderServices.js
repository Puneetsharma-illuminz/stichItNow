const dataBaseService = require("./databaseServices");
let universalFunctions = require('../universalFunction/functions');
const Jwt = require('jsonwebtoken');
let { constant } = require('../config')
async function getServiceProvider(payload) {
    try {
        let data = await dataBaseService.executeQuery(`
        SELECT 
        tb_service_provider.*
    FROM  
        tb_service_provider
         WHERE
    email = ? 
    group by tb_service_provider.id
    `, [payload.email]);
        if (data && data.length > 0) {
            data[0].permissions = universalFunctions.jsonParse(data[0].permissions)
            data[0].regions = universalFunctions.jsonParse(data[0].regions)
            if (data[0].has_all_access) {
                data[0].permissions = [constant.ROLE.SERVICE_PROVIDER]
            }
        }
        return data
    } catch (e) {
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
        throw e;
    }
}
async function getCategory(payload) {
    try {
        let sql = `select id,name,image,parent_id as parentId,(SELECT 
            JSON_OBJECT('original',TRIM(CONCAT(?,url)),'thumbnail',TRIM(CONCAT(?,thumbnail)))
        FROM
            attachment
        WHERE
            attachment.id = category.image) as imageToShow from category where 1 = 1 `
        let param = [constant.IMAGE_PATH, constant.IMAGE_PATH]
        for (let i = 0; i < Object.keys(payload).length; i++) {
            if (payload[Object.keys(payload)[i]] == null) {
                sql += ` and isnull(${Object.keys(payload)[i]})`
                    // param.push()
            } else {
                sql += ` and ${Object.keys(payload)[i]} =?`
                param.push(payload[Object.keys(payload)[i]])
            }
        }

        return await dataBaseService.executeQuery(sql, param)
    } catch (e) {
        throw e
    }
}
async function createToken(spDetail, remoteIp) {
    try {
        let session = await dataBaseService.executeQuery('insert into user_session (user_id,remote_ip,device_token,role,device_type) values (?,?,?,?,?)', [spDetail.id, remoteIp, spDetail.deviceToken, spDetail.role, spDetail.devicetype]);
        const dataForJwtToken = {
            sessionId: session.insertId,
            userId: spDetail.id,
            dateOfCreation: new Date(),
            role: spDetail.role,
            country: spDetail.country,
            permissions: spDetail.permissions,
            regions: spDetail.regions
        };
        let expireTime = {
            expiresIn: '2d'
        };
        const token = Jwt.sign(dataForJwtToken, constant.JWT_SECRET, expireTime);

        return token;
    } catch (e) {
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
        throw e;
    }
}
async function getCategoryWithChild() {
    try {
        let data = await dataBaseService.executeQuery(`
                SELECT 
            cat1.id,
            cat1.name,
            cat1.image,
            cat1.parent_id AS parentId,
            (SELECT 
                    JSON_OBJECT('original',
                                TRIM(CONCAT(?, url)),
                                'thumbnail',
                                TRIM(CONCAT(?,
                                            thumbnail)))
                FROM
                    attachment
                WHERE
                    attachment.id = cat1.image) AS imageToShow,
                    if(isnull(cat2.name),'[]',json_arrayagg(JSON_OBJECT('id',cat2.id,'name',cat2.name))) as children
                
        FROM
            category as cat1
            LEFT JOIN category as  cat2 on  cat1.id = cat2.parent_id
        WHERE
            isnull(cat1.parent_id)
            
            group by cat1.id
        `, [constant.IMAGE_PATH, constant.IMAGE_PATH])
        return data
    } catch (e) {
        e = universalFunction.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
        throw e;
    }
}
async function getCoutryDetails(country) {
    try {
        let data = await dataBaseService.executequery('select * from countries where id = ?', [country])
        return data[0]
    } catch (e) {
        e = universalFunction.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
        throw e;
    }
}
module.exports = {
    getCategory,
    getServiceProvider,
    createToken,
    getCategoryWithChild,
    getCoutryDetails
};