const dataBaseService = require("./databaseServices");

let universalFunction = require('../universalFunction/functions')
// const Jwt = P.promisifyAll(require('jsonwebtoken'));
let { constant } = require('../config')

async function getItemQuantity(itemId){
    try{
        let sql = `select json_objectagg(id,quantity) as map from items  `
      let param = []
        if(itemId){
            sql+= ` where id = ?`
            param.push(itemId)
        }
        sql +=` group by id`
     let data =  await dataBaseService.executeQuery(sql,param)
    let item  = {}
     for(let i=0;i<data.length;i++){
        item = {...item,...universalFunctions.jsonParse(data[i].map)}
     }
     return item
    }catch(e){
        throw e
    }
}
module.exports = {
    getItemQuantity
};