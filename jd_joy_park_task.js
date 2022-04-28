/*
脚本默认会帮我助力开工位，介意请添加变量HELP_JOYPARK，false为不助力
export HELP_JOYPARK=""
更新地址：https://github.com/Tsukasa007/my_script
汪汪乐园每日任务
0 0,7,9,17,20 * * * jd_joypark_task.js
annyooo 修复
*/

const $ = new Env('汪汪乐园每日任务');
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
const notify = $.isNode() ? require('./sendNotify') : '';
//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '';
let newShareCodes = [];

if ($.isNode()) {
    Object.keys(jdCookieNode).forEach((item) => {
        cookiesArr.push(jdCookieNode[item])
    })
    if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => { };
} else {
    cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}

$.invitePinTaskList = []
$.invitePin = []
$.unLogins = []
$.balckIndexs = []

const JD_API_HOST = `https://api.m.jd.com/client.action`;
message = ""

!(async () => {
    if (!cookiesArr[0]) {
        $.msg($.name, '【提示】请先获取cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/', {
            "open-url": "https://bean.m.jd.com/"
        });
        return;
    }
    for (let i = 0; i < cookiesArr.length; i++) {
        cookie = cookiesArr[i];
        if (cookie) {
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
            $.index = i + 1;
            $.isLogin = true;
            $.nickName = '';
            await TotalBean();
            console.log(`\n\n******开始【京东账号${$.index}】${$.nickName || $.UserName}*********\n`);

            if (!$.isLogin) {
                console.log("Cookie已失效. . .")
                $.unLogins.push($.index)

                if ($.isNode()) {
                    await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
                }
                continue
            }

            // //开工位
            // if ($.index >= 2) {
            //   $.log(`帮 ${$.UserName} 开工位 :`)
            //   let resp = await getJoyBaseInfo( undefined, 2, $.invitePinTaskList[$.openIndex]);
            //   if (resp.data && resp.data.helpState && resp.data.helpState === 1) {
            //     $.log("开工位成功！");
            //   }else if (resp.data && resp.data.helpState && resp.data.helpState === 3) {
            //     $.log("你不是新用户了，开🐔八开！");
            //   }else if (resp.data && resp.data.helpState && resp.data.helpState === 2){
            //     $.log(`ck ${$.index} -  ${$.UserName} 开满了不开了`);
            //     $.openIndex++
            //   }else {
            //     $.log("开工位失败！");
            //   }
            // }

            await getJoyBaseInfo()
            if ($.joyBaseInfo && $.joyBaseInfo.invitePin) {
                $.thisCode = $.joyBaseInfo.invitePin
                console.log(`互助码:${$.thisCode}\n`);
                let thisarr = []
                thisarr.push($.index)
                thisarr.push($.thisCode)
                thisarr.push($.UserName)
                $.invitePinTaskList.push(thisarr);
            } else {
                // $.log(`${$.name} - ${$.UserName}  助力码: null`);
                // $.invitePinTaskList.push('');
                console.log(`活动信息获取失败`);
                $.balckIndexs.push($.index)
                continue
            }

            await getTaskList();

            // 签到 / 逛会场 / 浏览商品
            for (const task of $.taskList) {
                if (task.taskType === 'SIGN') {
                    $.log(`${task.taskTitle} 签到`)
                    await apDoTask(task.id, task.taskType, undefined);
                    $.log(`${task.taskTitle} 领取签到奖励`)
                    await apTaskDrawAward(task.id, task.taskType);
                }
                if (task.taskType === 'BROWSE_PRODUCT' || task.taskType === 'BROWSE_CHANNEL') {
                    let productList = await apTaskDetail(task.id, task.taskType);
                    if (!productList) return
                    let productListNow = 0;
                    if (productList.length === 0) {
                        let resp = await apTaskDrawAward(task.id, task.taskType);
                        if (!resp.success) {
                            $.log(`${task.taskTitle} 领取完成!`)
                            productList = await apTaskDetail(task.id, task.taskType);
                        }
                    }
                    //做
                    while (task.taskLimitTimes - task.taskDoTimes >= 0) {
                        if (productList.length === 0) {
                            $.log(`${task.taskTitle} 活动火爆，素材库没有素材，我也不知道啥回事 = = `)
                            break
                        }
                        $.log(`${task.taskTitle} ${task.taskDoTimes}/${task.taskLimitTimes}`);
                        if (productList[productListNow]) {
                            let resp = await apDoTask(task.id, task.taskType, productList[productListNow].itemId, productList[productListNow].appid);
                            if (!resp.success) {
                                $.log(`${task.taskTitle} 任务完成！`)
                                break
                            }
                        }
                        productListNow++;
                        task.taskDoTimes++;
                    }
                    //领
                    for (let j = 0; j < task.taskLimitTimes; j++) {
                        let resp = await apTaskDrawAward(task.id, task.taskType);
                        if (!resp.success) {
                            $.log(`${task.taskTitle} 领取完成!`)
                            break
                        }
                    }
                } else if (task.taskType === 'SHARE_INVITE') {
                    for (let j = 0; j < 5; j++) {
                        let resp = await apTaskDrawAward(610, 'SHARE_INVITE');
                        if (!resp.success) {
                            break
                        }
                        $.log("领取助力奖励成功！")
                    }
                }
            }


        }
    }

    $.log("\n\n\n===================== 内部汪汪乐园互助 =====================\n")
    for (let i = 0; i < cookiesArr.length; i++) {
        cookie = cookiesArr[i];
        if (cookie) {
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
            $.index = i + 1;
            $.nickName = '';
            console.log(`\n******开始【京东账号${$.index}】${$.nickName || $.UserName}*********\n`);
            if ($.unLogins.includes($.index)) {
                console.log("Cookie已失效、跳过")
                continue
            }

            if ($.balckIndexs.includes($.index)) {
                console.log("账号数据异常、跳过")
                continue
            }

            await shareCodesFormat();
            if (!newShareCodes.length) {
                console.log("已无账号需要助力，助力结束")
                break
            }
            console.log('开始助力好友')
            console.log(`格式化后的助力码:${JSON.stringify(getCodes(newShareCodes))}\n`);
            for (let v of newShareCodes) {
                code = v[1]
                $.theName = v[2]
                console.log(`开始助力好友: ${code}`);
                if (!code) continue;
                if ($.index === v[0]) {
                    console.log('不能助力自己、跳过执行 . . .\n')
                    continue
                }
                let resp = await getJoyBaseInfo(610, 1, code);

                // console.log(`助力结果: ${JSON.stringify(resp)}`);

                if (resp && resp.success) {
                    if (resp.data.helpState === 1) {
                        $.log(`助力好友【${$.theName}】成功！\n`);
                    } else if (resp.data.helpState === 0) {
                        $.log(`自己不能助力自己！\n`);
                    } else if (resp.data.helpState === 2) {
                        $.log(`助力好友【${$.theName}】失败: 助力过了\n`);
                    } else if (resp.data.helpState === 3) {
                        $.log(`助力好友【${$.theName}】失败: 助力次数已耗尽\n`);
                        break
                    } else if (resp.data.helpState === 4) {
                        $.log(`助力好友【${$.theName}】失败: 好友助力已满\n`);
                        if (checkArr($.invitePinTaskList, code) > -1) $.invitePinTaskList.splice(checkArr($.invitePinTaskList, code), 1)
                    }
                } else {
                    $.log("数据异常 助力失败！\n")
                    break
                }
            }
        }
    }


})()
    .catch((e) => $.logErr(e))
    .finally(() => $.done())


function shareCodesFormat() {
    return new Promise(async resolve => {
        newShareCodes = [];
        if ($.invitePinTaskList.length > 0) for (let j of $.invitePinTaskList) newShareCodes.push(j)
        resolve();
    })
}

//获取活动信息

//任务列表
function getTaskList() {
    return new Promise(resolve => {
        $.post(taskPostClientActionUrl(`body=%7B%22linkId%22%3A%22LsQNxL7iWDlXUs6cFl-AAg%22%7D&appid=activities_platform`, `apTaskList`), async (err, resp, data) => {
            $.log('=== 任务列表 start ===')
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data);
                    $.taskList = data.data
                    $.taskList.forEach(row => {
                        $.log(`${row.taskTitle} ${row.taskDoTimes}/${row.taskLimitTimes}`)
                    })
                    $.log('=== 任务列表 end  ===')
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}

/**
 * 互助
 * @param taskId
 * @param inviteType
 * @param inviterPin
 * @returns {Promise<unknown>}
 */
async function getJoyBaseInfo(taskId = '', inviteType = '', inviterPin = '') {
    await $.wait(1000)
    return new Promise(resolve => {
        $.post(taskPostClientActionUrl(`body={"taskId":"${taskId}","inviteType":"${inviteType}","inviterPin":"${inviterPin}","linkId":"LsQNxL7iWDlXUs6cFl-AAg"}&_t=1625480372020&appid=activities_platform`, `joyBaseInfo`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data);
                    $.joyBaseInfo = data.data
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}


async function apDoTask(taskId, taskType, itemId = '', appid = 'activities_platform') {
    await $.wait(1000)
    return new Promise(resolve => {
        $.post(taskPostClientActionUrl(`body={"taskType":"${taskType}","taskId":${taskId},"channel":4,"linkId":"LsQNxL7iWDlXUs6cFl-AAg","itemId":"${itemId}"}&appid=${appid}`, `apDoTask`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data);
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}

async function apTaskDetail(taskId, taskType) {
    await $.wait(1000)
    return new Promise(resolve => {
        $.post(taskPostClientActionUrl(`functionId=apTaskDetail&body={"taskType":"${taskType}","taskId":${taskId},"channel":4,"linkId":"LsQNxL7iWDlXUs6cFl-AAg"}&appid=activities_platform`, `apTaskDetail`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data);
                    if (!data.success) {
                        $.taskDetailList = []
                    } else {
                        $.taskDetailList = data.data.taskItemList;
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                if (!data.success) {
                    resolve([]);
                } else {
                    resolve(data.data.taskItemList);
                }
            }
        })
    })
}

async function apTaskDrawAward(taskId, taskType) {
    await $.wait(1000)
    return new Promise(resolve => {
        $.post(taskPostClientActionUrl(`body={"taskType":"${taskType}","taskId":${taskId},"linkId":"LsQNxL7iWDlXUs6cFl-AAg"}&appid=activities_platform`, `apTaskDrawAward`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data);
                    $.log("领取奖励")
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}


function generateShareUrl(inviterId) {
    return "" +
        "https://black.jd.com/wybteg/vqqo?jumpPath=https%3A%2F%2Fjoypark.jd.com%3FactivityId%3D" +
        "LsQNxL7iWDlXUs6cFl-AAg" + //activityId
        "%26" +
        "inviterId%3D" +
        inviterId +//inviteType
        "%26inviteType%3D1%26taskId%3D167%26enter%3Ddefaultshare&dlChannel=superjd-mjsb-wwly&autoOpen=1&video=wwly"

}

function taskPostClientActionUrl(body, functionId) {
    return {
        url: `https://api.m.jd.com/client.action?${functionId ? `functionId=${functionId}` : ``}`,
        body: body,
        headers: {
            'User-Agent': 'jdltapp;iPhone;3.5.6;14.6;eac3e15e91fd380664fc7c788e8ab6a07805646d;network/4g;ADID/8F6CAEEA-5BF7-4F7E-86C3-A641C19CA832;hasUPPay/0;pushNoticeIsOpen/0;lang/zh_CN;model/iPhone13,2;addressid/1995295948;hasOCPay/0;appBuild/1070;supportBestPay/0;pv/41.26;apprpd/;ref/JDLTSubMainPageViewController;psq/2;ads/;psn/eac3e15e91fd380664fc7c788e8ab6a07805646d|112;jdv/0|kong|t_1000509960_|jingfen|bb9c79e4c4174521873879a27a707da4|1625071927291|1625071930;adk/;app_device/IOS;pap/JA2020_3112531|3.5.6|IOS 14.6;Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Host': 'api.m.jd.com',
            'Origin': 'https://joypark.jd.com',
            'Referer': 'https://joypark.jd.com/?activityId=LsQNxL7iWDlXUs6cFl-AAg&lng=113.387899&lat=22.512678&sid=4d76080a9da10fbb31f5cd43396ed6cw&un_area=19_1657_52093_0',
            'Cookie': cookie,
        }
    }
}

function TotalBean() {
    return new Promise(async resolve => {
        const options = {
            url: "https://me-api.jd.com/user_new/info/GetJDUserInfoUnion",
            headers: {
                Host: "me-api.jd.com",
                Accept: "*/*",
                Connection: "keep-alive",
                Cookie: cookie,
                "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
                "Accept-Language": "zh-cn",
                "Referer": "https://home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&",
                "Accept-Encoding": "gzip, deflate, br"
            }
        }
        $.get(options, (err, resp, data) => {
            try {
                if (err) {
                    $.logErr(err)
                } else {
                    if (data) {
                        data = JSON.parse(data);
                        if (data['retcode'] === "1001") {
                            $.isLogin = false; //cookie过期
                            return;
                        }
                        if (data['retcode'] === "0" && data.data && data.data.hasOwnProperty("userInfo")) {
                            $.nickName = data.data.userInfo.baseInfo.nickname;
                        }
                    } else {
                        $.log('京东服务器返回空数据');
                    }
                }
            } catch (e) {
                $.logErr(e)
            } finally {
                resolve();
            }
        })
    })
}

function jsonParse(str) {
    if (typeof str == "string") {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.log(e);
            $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
            return [];
        }
    }
}

function checkArr(arr, val) {
    for (let p = 0; p < arr.length; p++) {
        if (arr[p][0] == val || arr[p][1] == val || arr[p][2] == val) {
            return p
        }
    }
    return -1
}

function getCodes(arr) {
    let codeStr = []
    for (let p of arr) codeStr.push(p[1])
    // codeStr = codeStr.toString()
    return codeStr
}

// prettier-ignore
function Env(t, e) { "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0); class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
