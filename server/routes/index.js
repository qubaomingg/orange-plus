/**
 * Page Router & Ajax API.
 */

'use strict';

const fs = require('fs');
const url = require('url');
var querystring = require('querystring');
var moment = require('moment');
var md5 = require('md5');
var randomstring = require("randomstring");

var koaRequest = require('koa-request');
var HttpResponse = require('../common/httpResponse');
var Redpack = require('weixin-redpack');

var APPID = 'wx7ccadc024b3b0001';
var MCHID = '1325672901';
var SECRET_KEY = 'E6RjCC4xw0ov8RmwQ6MwHQdRFKvBRTf1';
var SHOP_NAME = '统一饮品集趣吧';

function getCommonConfig (url, cookie, data, method) {
    return {
        body: data && JSON.stringify(data),
        method: method || "GET",
        uri: url,
        headers: {
            "Content-Type": 'application/json',
            "Content-Length": Buffer.byteLength(JSON.stringify(data) || '', 'utf8'),
            "Cookie": cookie || ''
        }
    };
}


module.exports = function(app) {
    let httpMethod = require('../common/httpMethod');

    let ACCESS_TOKEN = 'https://api.weixin.qq.com/sns/oauth2/access_token';
    var APPSECRET = '5e8e8078f29190b657eaa3da42077379';
    var GET_USER_INFO = 'https://api.weixin.qq.com/sns/userinfo';

    app.get('/', function* (next) {
        yield this.render('../index')
    });

    app.get('/getAccess/:appid/:code', function *(next) {
    	var appid = this.params.appid;
    	var code = this.params.code;

    	var url = ACCESS_TOKEN + '?appid='+appid+'&secret='+APPSECRET+'&code='+code+'&grant_type=authorization_code'

        var config = getCommonConfig(url);
        
        var reponse = yield koaRequest(config);

        HttpResponse(reponse, this);
        yield next;
    })
    app.get('/getUserInfo/:access_token/:appid', function *(next) {
        var access_token = this.params.access_token;
        var openid = this.params.openid;

        var url = GET_USER_INFO + '?access_token='+access_token+'&openid='+openid+'lang=zh_CN'

        var config = getCommonConfig(url);
        
        var reponse = yield koaRequest(config);

        HttpResponse(reponse, this);
        yield next;
    })

    app.get('/getMoney/:moneyNum/:openid', function *(next) {
        var ORDER_ID = '1325672901' + moment().format('YYYYMMDD') + moment().format('MMDDHHmmss');
        var RANDOM_NUM = randomstring.generate({
          length: 16,
          charset: 'alphanumeric'
        });

        var moneyNum = this.params.moneyNum;
        var openid = this.params.openid;


        var url = 'https://api.mch.weixin.qq.com/mmpaymkttransfers/sendredpack';

        var postData = {
            nonce_str: RANDOM_NUM, //随机字符串
            mch_billno: ORDER_ID, //商户订单号,
            mch_id: MCHID, // 商户号,
            wxappid: APPID, // 公众账号appid
            send_name: 'testsend_name', // 商户名称
            re_openid: openid, // 用户openid  
            total_amount: moneyNum, // 付款金额   
            total_num: '1', // 红包发放总人数
            wishing: 'testwishing', //红包祝福语
            client_ip: getClientIp(this.req), // Ip地址  
            act_name: 'testact_name', // 活动名称   
            remark: 'testremark' // 备注,
        };
        var sign = getSign(postData);
        postData.sign = sign;
        postData.pfx = fs.readFileSync(process.cwd() + '/server/cert/apiclient_cert.p12')

        console.log(postData)
        console.log('.........');
        Redpack.sendRedpack(postData, function(err, result){
          console.log(result);
          console.log('.........');
        });

        // var postXMLData = '<?xml version="1.0" encoding="utf-8"?>' + 
        //                     '<Document>'+
        //                     '<nonce_str>' + postData.nonce_str + '</nonce_str>'+
        //                     '<mch_billno>' + postData.mch_billno + '</mch_billno>'+
        //                     '<mch_id>' + postData.mch_id + '</mch_id>'+
        //                     '<wxappid>' + postData.wxappid + '</wxappid>'+
        //                     '<send_name>' + postData.send_name + '</send_name>'+
        //                     '<re_openid>' + postData.re_openid + '</re_openid>'+
        //                     '<total_amount>' + postData.total_amount + '</total_amount>'+
        //                     '<total_num>' + postData.total_num + '</total_num>'+
        //                     '<wishing>' + postData.wishing + '</wishing>'+
        //                     '<client_ip>' + postData.client_ip + '</client_ip>'+
        //                     '<act_name>' + postData.act_name + '</act_name>'+
        //                     '<remark>' + postData.remark + '</remark>'+
        //                     '<sign>' + postData.sign + '</sign></Document>';
        
        // console.log('url:')
        // console.log(url)
        // console.log('=======postData==========')
        // console.log('postXMLData:')
        // console.log(postXMLData)

        // var reponse = yield koaRequest({
        //     body: postXMLData,
        //     method: 'POST',
        //     uri: url,
        //     headers: {
        //         "Content-Type": 'text/xml',
        //         "Content-Length": Buffer.byteLength(postXMLData || '', 'utf8')
        //     }
        // });
        // console.log('reponse.body:-----------------')
        // console.log(reponse.body)
        // HttpResponse(reponse, this);
        yield next;
    })

    // 获取签名
    function getSign(obj) {
        var parmsString = querystring.stringify(obj)
        var stringAArr = parmsString.split('&');
        var stringA = stringAArr.sort().join('&');
        console.log('第一步:' + stringA)

        // 以上是按ASCII排序

        var stringSignTemp = stringA + '&key=' + SECRET_KEY;
        console.log('第二步：'+stringSignTemp)

        var sign = md5(stringSignTemp).toUpperCase();

        console.log('第四步：'+sign)
        return sign;
    }
    function getClientIp(req) {
        var ip = req.headers['x-forwarded-for'] ||
             req.connection.remoteAddress ||
             req.socket.remoteAddress ||
             req.connection.socket.remoteAddress;

        return ip.replace('::ffff:', '');
    }
}
