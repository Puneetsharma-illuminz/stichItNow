const services = require("./databaseServices");
const universalFunctions = require("../universalFunction/functions");
let { constant } = require('../config')
const Jwt = require('jsonwebtoken');
const moment = require('moment')
 
async function createToken(spDetail, remoteIp) {
    try {

        let session = await services.executeQuery('insert into user_session (user_id,remote_ip,device_token,role,device_type) values (?,?,?,?,?)',
            [spDetail.id, remoteIp, spDetail.deviceToken, spDetail.role, spDetail.devicetype]);
        const dataForJwtToken = {
            sessionId: session.insertId,
            userId: spDetail.id,
            dateOfCreation: new Date(),
            role: spDetail.role,
            //isMerchant: spDetail.isMerchant
        };
        let expireTime = {
            expiresIn: '360d'
        };

        console.log(dataForJwtToken);
        const token = Jwt.sign(dataForJwtToken, constant.JWT_SECRET, expireTime);

        return token;
    } catch (e) {
        console.log(e)
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
        throw e;
    }
}
async function getUser(payload) {
    try {
        let param = [constant.IMAGE_PATH, constant.IMAGE_PATH];
        let sql = ` SELECT 
        users.id,
        email,
        full_name AS fullName,
        phoneNumber as phoneNumber,
        country_code as countryCode,
        is_active,
        password,
        users.type as isMerchant,
        (SELECT 
            JSON_OBJECT('original',TRIM(CONCAT(?,url)),'thumbnail',TRIM(CONCAT(?,thumbnail)))
        FROM
            attachment
        WHERE
            attachment.id = users.image) as image,
        JSON_ARRAYAGG(JSON_OBJECT('id',
                        customer_address.id,
                        'address',
                        customer_address.address,
                        'houseNumber',
                        customer_address.house_number,
                        'landMark',customer_address.land_mark,
                        'latitude',st_x(customer_address.location),
                        'longitude',st_y(customer_address.location),
                        'buildingName',building_name,
                        'type',customer_address.type,
                        'otherText',customer_address.other_text)) as address
    FROM
        users
            LEFT JOIN 
        customer_address ON users.id = customer_address.user_id   where 1=1`
        if (payload.phoneNumber) {
            sql += ` and phoneNumber = ?`
            param.push(payload.phoneNumber);
        }
        if (payload.userId) {
            sql += ` and users.id = ?`
            param.push(payload.userId)
        }
        `GROUP BY users.id`
        return await services.executeQuery(sql, param);


    } catch (e) {
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
        throw e;
    }
}
async function clearUserSession(userDetails) {
    try {
        return await services.executeQuery(`Delete from user_session where user_id = ? and role = ?`, [userDetails.id, userDetails.role]);
    } catch (e) {
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
        throw e;
    }
}

function pad(s, size) {
    s = s.toString();
    while (s.length < (size || 2)) { s = "0" + s; }
    return s;
}


async function getcuisine(payload, lang) {
    try {
        return await services.executeQuery(`SELECT 
        Item_cuisines.id, Item_cuisines.cuisines_name as cuisinesName
    FROM
        shops
            LEFT JOIN
            shop_cuisine ON shop_cuisine.shop_id = shops.id
            LEFT JOIN
            Item_cuisines on Item_cuisines.id = shop_cuisine.cuisine_id
    WHERE
        ST_DISTANCE_SPHERE(POINT(?,?),
                POINT(ST_y(location), ST_x(location))) < (SELECT   if(distance_unit=1, user_shop_distance*1609.34,user_shop_distance*1000) FROM admin_setting where country_id =shops.country) and shop_status<>0
    GROUP BY Item_cuisines.id having  Item_cuisines.id>0`, [payload.userLongitude, payload.userLatitude])
        // return []
    } catch (e) {
        e = universalFunction.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
        throw e;
    }
}
async function getAddress(addtessId) {
    try {
        return await services.executeQuery(`
                        SELECT 
                            customer_address.id as id,
                            customer_address.address as address,
                            customer_address.house_number as houseNumber,
                            customer_address.land_mark as landMark,
                            st_x(customer_address.location) as latitude,
                            st_y(customer_address.location) as longitude,
                            customer_address.type as type,
                            customer_address.other_text as otherText,
                            building_name as buildingName
                        FROM
                                    customer_address 
                        where customer_address.id = ?
                                    `, [addtessId])
    } catch (e) {
        e = universalFunction.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
        throw e;
    }
}
async function assignAddress(payload, user, connection) {
    try {
        let address = await services.runTransaction(`insert into order_address (user_id,address,house_number,land_mark,type,location,other_text)  (select  user_id,address,house_number,land_mark,type,location,other_text  from customer_address where id = ? )`, [payload.addressId], connection)
        return address
    } catch (e) {
        e = universalFunction.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
        throw e;
    }
}

async function getCategoryWithId(payload, user) {
    try {
        let param = [constant.IMAGE_PATH, constant.IMAGE_PATH]
        let sql = ` 
    SELECT id , name  , json_arrayagg(products) as products  from (
        SELECT 
        cat1.id, cat1.name,cat1.parent_id,
                      JSON_OBJECT('id',
                              if(par.show_individual =1 , items.id,par.id ),
                              'name',
                          if(par.show_individual =1, items.name,par.name),
                              'subCategoryId',
                              items.sub_category_id,
                              'brand',JSON_OBJECT('id',brand.id,'name',brand.name),
                              'variants',
                          JSON_ARRAYAGG(JSON_OBJECT('name',concat(items.variant_name,' ',label),'details',(select json_arrayagg(JSON_OBJECT('title',item_details.title,'detail',item_details.detail,'id',item_details.id)) from item_details where  item_id = items.id ),'packagingCharges',items.packaging_charges,'id',items.id,'productId',if(par.show_individual =1, items.id,par.id ),'availableQuantity',warehouse_items.quantity_receive,'price',items.price,'finalPrice',items.price,'isDefault',if(par.show_individual =1,1,items.default),'currencyCode',countries.currencyName,'images',(select JSON_ARRAYAGG( JSON_OBJECT('original',TRIM(CONCAT(?,url)),'thumbnail',TRIM(CONCAT(?,thumbnail))))  from item_images  LEFT JOIN  attachment on attachment.id = item_images.image where item_images.item = items.id)))
                              ) AS products
          FROM
              items as items
                 LEFT JOIN items as par on if(isNULL(items.parent_id),par.id = items.id,par.id = items.parent_id)  
                 LEFT JOIN warehouse on  warehouse.id = ${payload.warehouse} 
                 LEFT JOIN warehouse_items on items.id = warehouse_items.item_id and  warehouse.id = warehouse_items.warehouse_id
                 LEFT JOIN countries on countries.id  = warehouse.country_id
                 LEFT JOIN category as cat1 on items.sub_category_id = cat1.id
                 LEFT JOIN brand on brand.id = items.brand
                 LEFT JOIN unit_types on unit_types.id = items.unit
                 WHERE
                    not isNULL(items.name) and ${user.isMerchant?'items.is_merchant =1':'items.is_customer =1'} and if(par.show_individual =1,1=1,${user.isMerchant?'par.is_merchant =1':'par.is_customer =1'})
                 group by   if(par.show_individual =1, items.id,par.id )
                  )as cat1 where 1 = 1 `
        if (payload.parent_id) {
            sql += ` and cat1.parent_id =?`
            param.push(payload.parent_id)
        }
        if (payload.subCategoryId) {
            sql += ` and cat1.id =?`
            param.push(payload.subCategoryId)
        }
        sql += `  group by cat1.id`;
        if (payload.nextPageId) {
            sql += ` having cat1.id <= ?`
            param.push(payload.nextPageId)
        }
        sql += ` order by cat1.id desc limit ?`
        param.push(constant.LIMIT + 1)
        let nextPageId = null
        let data = await services.executeQuery(sql, param)
        if (data && data.length > 0) {
            if (data.length < constant.LIMIT) {
                nextPageId = null
            } else {
                nextPageId = data.pop()
                nextPageId = nextPageId.id
            }
        }
        return { nextPageId, data }
    } catch (e) {
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
        throw e;
    }
}
async function getProducts(payload, user) {
    try {
        let param = [constant.IMAGE_PATH, constant.IMAGE_PATH]
        let sql = `  SELECT 
    cat1.id, cat1.name,cat1.parent_id,
                  JSON_OBJECT('id',
                          if(par.show_individual =1 , items.id,par.id ),
                          'name',
                      if(par.show_individual =1, items.name,par.name),
                          'subCategoryId',
                          items.sub_category_id,
                          'brand',JSON_OBJECT('id',brand.id,'name',brand.name),
                            'variants',
                            JSON_ARRAYAGG(JSON_OBJECT('name',concat(items.variant_name,' ',label),'details',(select json_arrayagg(JSON_OBJECT('title',item_details.title,'detail',item_details.detail,'id',item_details.id)) from item_details where  item_id = items.id ),'packagingCharges',items.packaging_charges,'id',items.id,'productId',if(par.show_individual =1, items.id,par.id ),'availableQuantity',warehouse_items.quantity_receive,'price',items.price,'finalPrice',items.price,'isDefault',if(par.show_individual =1,1,items.default),'currencyCode',countries.currencyName,'images',(select JSON_ARRAYAGG( JSON_OBJECT('original',TRIM(CONCAT(?,url)),'thumbnail',TRIM(CONCAT(?,thumbnail))))  from item_images  LEFT JOIN  attachment on attachment.id = item_images.image where item_images.item = items.id)))    
                        ) AS products
      FROM
          items as items
             LEFT JOIN items as par on if(isNULL(items.parent_id),par.id = items.id,par.id = items.parent_id)  
             LEFT JOIN warehouse on  warehouse.id = ${payload.warehouse} 
             LEFT JOIN warehouse_items on items.id = warehouse_items.item_id and  warehouse.id = warehouse_items.warehouse_id
             LEFT JOIN countries on countries.id  = warehouse.country_id
             LEFT JOIN category as cat1 on items.sub_category_id = cat1.id
             LEFT JOIN brand on brand.id = items.brand
             LEFT JOIN unit_types on unit_types.id = items.unit
             WHERE
                not isNULL(items.name) and ${user.isMerchant?'items.is_merchant =1':'items.is_customer =1'}  and if(par.show_individual =1,1=1,${user.isMerchant?'par.is_merchant =1':'par.is_customer =1'})
                       `
        if (payload.productId) {
            sql += ` and if(par.show_individual =1, items.id = ${payload.productId} , items.id = ${payload.productId} or items.parent_id = ${payload.productId} ) `
        }
        if (payload.subCategoryId) {
            sql += ` and items.sub_category_id = ?`
            param.push(payload.subCategoryId)
        }
        if (payload.notInclude) {
            sql += ` and items.id  <> ?`
            param.push(payload.notInclude)
        }
        if (payload.brandId) {
            sql += ` and brand.id  = ?`
            param.push(payload.brandId)
        }
        sql += ` group by   if(par.show_individual =1, items.id,par.id )  `
        return services.executeQuery(sql, param)
    } catch (e) {
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
        throw e;
    }
}
async function getSimmilarProducts(details,user) {
    try {
        let sql = `select 
        JSON_OBJECT('id',
        if(par.show_individual =1 , items.id,par.id ),
        'name',
    if(par.show_individual =1, items.name,par.name),
        'subCategoryId',
        items.sub_category_id,
        'brand',JSON_OBJECT('id',brand.id,'name',brand.name),
          'variants',
    JSON_ARRAYAGG(JSON_OBJECT('name',concat(items.variant_name,' ',label),'details',(select json_arrayagg(JSON_OBJECT('title',item_details.title,'detail',item_details.detail,'id',item_details.id)) from item_details where  item_id = items.id ),'packagingCharges',items.packaging_charges,'id',items.id,'productId',if(par.show_individual =1, items.id,par.id ),'availableQuantity',warehouse_items.quantity_receive,'price',items.price,'finalPrice',items.price,'isDefault',if(par.show_individual =1,1,items.default),'currencyCode',countries.currencyName,'images',(select JSON_ARRAYAGG( JSON_OBJECT('original',TRIM(CONCAT(?,url)),'thumbnail',TRIM(CONCAT(?,thumbnail))))  from item_images  LEFT JOIN  attachment on attachment.id = item_images.image where item_images.item = items.id)))
        ) AS products
        FROM
        items as items
        LEFT JOIN items as par on if(isNULL(items.parent_id),par.id = items.id,par.id = items.parent_id)  
        LEFT JOIN warehouse on  warehouse.id = ${details.warehouse} 
        LEFT JOIN warehouse_items on items.id = warehouse_items.item_id and  warehouse.id = warehouse_items.warehouse_id
        LEFT JOIN countries on countries.id  = warehouse.country_id
        LEFT JOIN category as cat1 on items.sub_category_id = cat1.id
        LEFT JOIN brand on brand.id = items.brand
        LEFT JOIN unit_types on unit_types.id = items.unit
        LEFT JOIN similar_item on 
            similar_item.related_item = items.id or similar_item.related_item = items.parent_id
                OR items.parent_id = items.id
        WHERE
        not isNULL(items.name) and ${user.isMerchant?'items.is_merchant =1':'items.is_customer =1'} and if(par.show_individual =1,1=1,${user.isMerchant?'par.is_merchant =1':'par.is_customer =1'})  and   similar_item.item_id = ? or  items.parent_id =items.id   group by   if(par.show_individual =1, items.id,par.id )  `
        let param = [constant.IMAGE_PATH, constant.IMAGE_PATH, details.id, details.id]
        return services.executeQuery(sql, param)
    } catch (e) {
        e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
        throw e;
    }
}
async function getBrand(payload) {
    try {
        return await services.executeQuery(`SELECT 
   brand.id,
   brand.name,
   JSON_OBJECT('original',
           TRIM(CONCAT(?, url)),
           'thumbnail',
           TRIM(CONCAT(?, thumbnail))) AS image
FROM
   brand
       LEFT JOIN
   attachment ON attachment.id = brand.image where brand.id = ? `, [constant.IMAGE_PATH, constant.IMAGE_PATH, payload.brandId])
    } catch (e) {
        e = universalFunction.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
        throw e;
    }
}

async function getNearByWarehouse(payload) {
    try {
        let distance = await services.executeQuery(`select user_view_distance_km from admin_setting limit 1`)
        distance = distance[0] ? distance[0].user_view_distance_km : 10
        return await services.executeQuery(`SELECT id,
    ST_DISTANCE_SPHERE(POINT(ST_Y(warehouse.location),
                ST_X(warehouse.location)),
            POINT(?,?)) as distance
 FROM
    warehouse
WHERE
 1=1  
 group by is_deleted = 0 and status = 1
  having distance <${distance} * 10000 `, [payload.userLongitude, payload.userLatitude])
    } catch (e) {
        e = universalFunction.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
        throw e;
    }
}
module.exports = {
    createToken,
    getUser,
    clearUserSession,
    getcuisine,
    getAddress,
    assignAddress,
    // getNearByCategories,
    getCategoryWithId,
    getProducts,
    getSimmilarProducts,
    getBrand,
    getNearByWarehouse
}