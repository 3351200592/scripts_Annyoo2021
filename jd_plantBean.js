/*
种豆得豆
活动入口：京东APP我的-更多工具-种豆得豆
每个京东账号每天只能帮助3个人。多出的助力码将会助力失败。
1 7-21/2 * * * jd_plantBean.js
annyooo 修改
*/

const $ = new Env('京东种豆得豆');
let jdNotify = true;//是否开启静默运行。默认true开启
let cookiesArr = [], cookie = '', notify = '', option = '', message = '', subTitle = '';
let newShareCodes = [];

const thefs = require('fs');

let outpath = './PlantBean_HelpOut.json'
$.HelpOuts = { "thisDay": new Date().getDate(), "helpOut": [], "helpFull": [] }
$.Helptext = ""
$.helpJson = {}

if (thefs.existsSync(outpath)) $.Helptext = thefs.readFileSync(outpath, 'utf-8')
if ($.Helptext) $.helpJson = JSON.parse($.Helptext)
if (JSON.stringify($.helpJson) != "{}" && $.helpJson.thisDay && $.helpJson.thisDay == $.HelpOuts.thisDay) {
    if ($.helpJson.helpOut && $.helpJson.helpOut.length) for (let n of $.helpJson.helpOut) if ($.HelpOuts.helpOut.indexOf(n) == -1) $.HelpOuts.helpOut.push(n)
    if ($.helpJson.helpFull && $.helpJson.helpFull.length) for (let m of $.helpJson.helpFull) if ($.HelpOuts.helpFull.indexOf(m) == -1) $.HelpOuts.helpFull.push(m)
}

$.helpOut = $.HelpOuts.helpOut
$.helpFull = $.HelpOuts.helpFull

$.unLogins = []
$.otherCodes = []
$.myCodes = []
$.myFronts = []
$.helpRunout = []
$.blackIndexs = []
// 互助环境变量1 设定固定车头助力码、大小写逗号隔开、连续多个可直接用 - 、如：1-10，可混用如：1,2,3,7-15
let helpFronts = $.isNode() ? (process.env.jd_helpFronts ? process.env.jd_helpFronts : []) : []
// 互助环境变量2 除了固定互助码放前面被助力 之外的账号 设定随机还是顺序助力，true为随机，false为顺序
let helpRandom = $.isNode() ? (process.env.jd_helpRandom ? process.env.jd_helpRandom : false) : false

if (helpFronts.length > 0) {
    helpFronts = helpFronts.replace(/，/g, ",").replace(/ /g, "").split(",")
    for (let n in helpFronts) {
        let v = helpFronts[n]
        if (v.match(/\d+-\d+/g) && v.match(/\d+-\d+/g).length > 0) {
            let a = Number(v.split("-")[0].replace(/ /g, ""))
            let b = Number(v.split("-")[1].replace(/ /g, ""))
            if (b > a) {
                let arr = generateArr(a, b)
                for (let t of arr) $.myFronts.push(t)
            }
        } else $.myFronts.push(Number(v))
    }
    $.myFronts = [...new Set($.myFronts)]
}

//京东接口地址
const JD_API_HOST = 'https://api.m.jd.com/client.action';

let allMessage = ``;
let currentRoundId = null;//本期活动id
let lastRoundId = null;//上期id
let roundList = [];
let awardState = '';//上期活动的京豆是否收取
let num;

!(async () => {
    await requireConfig();
    if (!cookiesArr[0]) {
        $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', { "open-url": "https://bean.m.jd.com/bean/signIndex.action" });
        return;
    }
    $.theStart = new Date().getTime()

    for (let i = 0; i < cookiesArr.length; i++) {
        if (cookiesArr[i]) {
            cookie = cookiesArr[i];
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
            $.index = i + 1;
            $.isLogin = true;
            $.nickName = '';
            await TotalBean();
            console.log(`\n\n\n开始【京东账号${$.index}】${$.nickName || $.UserName}\n`);
            if (!$.isLogin) {
                console.log("Cookie已失效. . .")
                $.unLogins.push($.index)

                if ($.isNode()) {
                    await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
                }

                if ($.myFronts.includes($.index)) $.myFronts = $.myFronts.filter(function (item) { return item !== $.index })

                continue
            }
            message = '';
            subTitle = '';
            option = {};
            await jdPlantBean();
            await showMsg();
            if ($.index % 5 == 0) {
                console.log(`\n\n***************** 每5个账号休息1分钟、已用时${parseInt((new Date().getTime() - $.theStart) / 1000)}秒 *****************`)
                await $.wait(parseInt(Math.random() * 5000 + 60000, 10))
            }
        }
    }

    console.log(`\n\n***************** 日常任务结束、已用时${parseInt((new Date().getTime() - $.theStart) / 1000)}秒 *****************`)

    if ($.helpFull.length) {
        for (let t of $.helpFull) {
            if (checkArr($.myCodes, t) > -1) $.myCodes.splice(checkArr($.myCodes, t), 1) // 剔除助力已满的助力码
            if (checkArr($.otherCodes, t) > -1) $.otherCodes.splice(checkArr($.otherCodes, t), 1) // 剔除助力已满的助力码
        }
    }

    console.log(`\n\n\n======================= 开始互助 =======================`);
    $.heplTimes = 0
    for (let i = 0; i < cookiesArr.length; i++) {
        if (cookiesArr[i]) {
            cookie = cookiesArr[i];
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
            $.index = i + 1;
            $.nickName = '';
            console.log(`\n*********开始【京东账号${$.index}】${$.nickName || $.UserName}*********\n`);
            if ($.unLogins.includes($.index)) {
                console.log("Cookie已失效. . .")
                continue
            }
            if ($.helpRunout.includes($.index) || $.helpOut.includes($.UserName)) {
                console.log("助力次数耗尽、不执行此账号. . .")
                continue
            }
            if ($.blackIndexs.includes($.index)) {
                console.log("种豆数据异常、不执行此账号. . .")
                continue
            }
            await shareCodesFormat();
            if (!newShareCodes.length) {
                console.log("已无账号需要助力，助力结束")
                break
            }
            $.heplTimes = $.heplTimes + 1
            await doHelp(); //助力
            if ($.heplTimes % 5 == 0) {
                console.log(`\n\n***************** 每请求5个账号休息1分钟、已用时${parseInt((new Date().getTime() - $.theStart) / 1000)}秒 *****************\n`)
                await $.wait(parseInt(Math.random() * 5000 + 60000, 10))
            }
        }
    }

    thefs.writeFile(outpath, JSON.stringify($.HelpOuts), function (err) {
        if (err) console.log(`\n\n写入缓存失败：${err}\n`)
        else console.log("\n\n写入缓存成功 . . .\n")
    })
    await $.wait(1000)

    if ($.isNode() && allMessage) {
        await notify.sendNotify(`${$.name}`, `${allMessage}`)
    }
})()
    .catch((e) => {
        $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
        $.done();
    })

async function jdPlantBean() {
    try {
        // console.log(`获取任务及基本信息`)
        await plantBeanIndex();
        if (!$.plantBeanIndexResult) return
        if ($.plantBeanIndexResult.errorCode === 'PB101') {
            console.log(`\n活动太火爆了，还是去买买买吧！\n`)
            return
        }
        if ($.plantBeanIndexResult.data) {
            for (let i = 0; i < $.plantBeanIndexResult.data.roundList.length; i++) {
                if ($.plantBeanIndexResult.data.roundList[i].roundState === "2") {
                    num = i
                    break
                }
            }
        }
        // console.log(plantBeanIndexResult.data.taskList);
        if ($.plantBeanIndexResult && $.plantBeanIndexResult.code === '0' && $.plantBeanIndexResult.data) {
            const shareUrl = $.plantBeanIndexResult.data.jwordShareInfo.shareUrl
            $.thisCode = getParam(shareUrl, 'plantUuid')
            console.log(`互助码:${$.thisCode}\n`);

            let thisarr = []
            thisarr.push($.index)
            thisarr.push($.thisCode)
            thisarr.push($.UserName)
            if (checkArr($.otherCodes, $.thisCode) == -1 && !$.myFronts.includes($.index)) $.otherCodes.push(thisarr)
            if (checkArr($.myCodes, $.thisCode) == -1 && $.myFronts.length > 0 && $.myFronts.includes($.index)) $.myCodes.push(thisarr)

            roundList = $.plantBeanIndexResult.data.roundList;
            currentRoundId = roundList[num].roundId;//本期的roundId
            lastRoundId = roundList[num - 1].roundId;//上期的roundId
            awardState = roundList[num - 1].awardState;
            $.taskList = $.plantBeanIndexResult.data.taskList;
            subTitle = `【京东昵称】${$.plantBeanIndexResult.data.plantUserInfo.plantNickName}`;
            message += `【上期时间】${roundList[num - 1].dateDesc.replace('上期 ', '')}\n`;
            message += `【上期成长值】${roundList[num - 1].growth}\n`;
            await receiveNutrients();//定时领取营养液
            await doTask();//做日常任务
            //await doEgg();//注释结束任务
            await stealFriendWater();
            await doCultureBean();
            await doGetReward();
            await showTaskProcess();
            await plantShareSupportList();
        } else {
            console.log(`初始化种豆得豆-数据异常:  ${JSON.stringify($.plantBeanIndexResult) || "未知"}`);
            if (!$.blackIndexs.includes($.index)) $.blackIndexs.push($.index)
        }
    } catch (e) {
        $.logErr(e);
        const errMsg = `京东账号${$.index} ${$.nickName || $.UserName}\n任务执行异常，请检查执行日志 ‼️‼️`;
        if ($.isNode()) await notify.sendNotify(`${$.name}`, errMsg);
        $.msg($.name, '', `${errMsg}`)
    }
}

async function doGetReward() {
    console.log(`【上轮京豆】${awardState === '4' ? '采摘中' : awardState === '5' ? '可收获了' : '已领取'}`);
    if (awardState === '4') {
        //京豆采摘中...
        message += `【上期状态】${roundList[num - 1].tipBeanEndTitle}\n`;
    } else if (awardState === '5') {
        //收获
        await getReward();
        console.log('开始领取京豆');
        if ($.getReward && $.getReward.data && $.getReward.code === '0') {
            console.log('京豆领取成功');
            message += `【上期兑换京豆】${$.getReward.data.awardBean}个\n`;
            $.msg($.name, subTitle, message);
            allMessage += `京东账号${$.index} ${$.nickName}\n${message}${$.index !== cookiesArr.length ? '\n\n' : ''}`
            // if ($.isNode()) {
            //   await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName || $.UserName}`, `京东账号${$.index} ${$.nickName}\n${message}`);
            // }
        } else {
            console.log(`$.getReward 异常：${JSON.stringify($.getReward)}`)
        }
    } else if (awardState === '6') {
        //京豆已领取
        message += `【上期兑换京豆】${roundList[num - 1].awardBeans}个\n`;
    }
    if (roundList[num].dateDesc.indexOf('本期 ') > -1) {
        roundList[num].dateDesc = roundList[num].dateDesc.substr(roundList[num].dateDesc.indexOf('本期 ') + 3, roundList[num].dateDesc.length);
    }
    message += `【本期时间】${roundList[num].dateDesc}\n`;
    message += `【本期成长值】${roundList[num].growth}\n`;
}

async function doCultureBean() {
    await plantBeanIndex();
    if ($.plantBeanIndexResult && $.plantBeanIndexResult.data && $.plantBeanIndexResult.code === '0') {
        const plantBeanRound = $.plantBeanIndexResult.data.roundList[num]
        if (plantBeanRound.roundState === '2') {
            //收取营养液
            if (plantBeanRound.bubbleInfos && plantBeanRound.bubbleInfos.length) console.log(`开始收取营养液`)
            for (let bubbleInfo of plantBeanRound.bubbleInfos) {
                console.log(`收取-${bubbleInfo.name}-的营养液`)
                await cultureBean(plantBeanRound.roundId, bubbleInfo.nutrientsType)
                console.log(`收取营养液结果:${JSON.stringify($.cultureBeanRes)}`)
            }
        }
    } else {
        console.log(`plantBeanIndexResult:${JSON.stringify($.plantBeanIndexResult)}`)
    }
}

async function stealFriendWater() {
    await stealFriendList();
    if ($.stealFriendList && $.stealFriendList.code === '0') {
        if ($.stealFriendList.data && $.stealFriendList.data.tips) {
            console.log('\n\n今日偷取好友营养液已达上限\n\n');
            return
        }
        if ($.stealFriendList.data && $.stealFriendList.data.friendInfoList && $.stealFriendList.data.friendInfoList.length > 0) {
            let nowTimes = new Date(new Date().getTime() + new Date().getTimezoneOffset() * 60 * 1000 + 8 * 60 * 60 * 1000);
            for (let item of $.stealFriendList.data.friendInfoList) {
                if (new Date(nowTimes).getHours() === 20) {
                    if (item.nutrCount >= 2) {
                        // console.log(`可以偷的好友的信息::${JSON.stringify(item)}`);
                        console.log(`可以偷的好友的信息paradiseUuid::${JSON.stringify(item.paradiseUuid)}`);
                        await collectUserNutr(item.paradiseUuid);
                        console.log(`偷取好友营养液情况:${JSON.stringify($.stealFriendRes)}`)
                        if ($.stealFriendRes && $.stealFriendRes.code === '0') {
                            console.log(`偷取好友营养液成功`)
                        }
                    }
                } else {
                    if (item.nutrCount >= 3) {
                        // console.log(`可以偷的好友的信息::${JSON.stringify(item)}`);
                        console.log(`可以偷的好友的信息paradiseUuid::${JSON.stringify(item.paradiseUuid)}`);
                        await collectUserNutr(item.paradiseUuid);
                        console.log(`偷取好友营养液情况:${JSON.stringify($.stealFriendRes)}`)
                        if ($.stealFriendRes && $.stealFriendRes.code === '0') {
                            console.log(`偷取好友营养液成功`)
                        }
                    }
                }
            }
        }
    } else {
        console.log(`$.stealFriendList 异常： ${JSON.stringify($.stealFriendList)}`)
    }
}

async function doEgg() {
    await egg();
    if ($.plantEggLotteryRes && $.plantEggLotteryRes.data && $.plantEggLotteryRes.code === '0') {
        if ($.plantEggLotteryRes.data.restLotteryNum > 0) {
            const eggL = new Array($.plantEggLotteryRes.data.restLotteryNum).fill('');
            console.log(`目前共有${eggL.length}次扭蛋的机会`)
            for (let i = 0; i < eggL.length; i++) {
                console.log(`开始第${i + 1}次扭蛋`);
                await plantEggDoLottery();
                console.log(`天天扭蛋成功：${JSON.stringify($.plantEggDoLotteryResult)}`);
            }
        } else {
            console.log('暂无扭蛋机会')
        }
    } else {
        console.log('查询天天扭蛋的机会失败' + JSON.stringify($.plantEggLotteryRes))
    }
}

async function doTask() {
    if ($.taskList && $.taskList.length > 0) {
        for (let item of $.taskList) {
            if (item.isFinished === 1) {
                console.log(`${item.taskName} 任务已完成\n`);
                continue;
            } else {
                if (item.taskType === 8) {
                    console.log(`\n【${item.taskName}】任务未完成,需自行手动去京东APP完成，${item.desc}营养液\n`)
                } else {
                    console.log(`\n【${item.taskName}】任务未完成,${item.desc}营养液\n`)
                }
            }
            if (item.dailyTimes === 1 && item.taskType !== 8) {
                console.log(`\n开始做 ${item.taskName}任务`);
                // $.receiveNutrientsTaskRes = await receiveNutrientsTask(item.taskType);
                await receiveNutrientsTask(item.taskType);
                console.log(`做 ${item.taskName}任务结果:${JSON.stringify($.receiveNutrientsTaskRes)}\n`);
            }
            if (item.taskType === 3) {
                //浏览店铺
                console.log(`开始做 ${item.taskName}任务`);
                let unFinishedShopNum = item.totalNum - item.gainedNum;
                if (unFinishedShopNum === 0) {
                    continue
                }
                await shopTaskList();
                const { data } = $.shopTaskListRes;
                let goodShopListARR = [], moreShopListARR = [], shopList = [];
                const { goodShopList, moreShopList } = data;
                if (goodShopList && goodShopList.length > 0) {
                    for (let i of goodShopList) {
                        if (i.taskState === '2') {
                            goodShopListARR.push(i);
                        }
                    }
                }
                if (moreShopList && moreShopList.length > 0) {
                    for (let j of moreShopList) {
                        if (j.taskState === '2') {
                            moreShopListARR.push(j);
                        }
                    }
                }
                shopList = goodShopListARR.concat(moreShopListARR);
                if (shopList && shopList.length > 0) {
                    for (let shop of shopList) {
                        const { shopId, shopTaskId } = shop;
                        const body = {
                            "monitor_refer": "plant_shopNutrientsTask",
                            "shopId": shopId,
                            "shopTaskId": shopTaskId
                        }
                        const shopRes = await requestGet('shopNutrientsTask', body);
                        console.log(`shopRes结果:${JSON.stringify(shopRes)}`);
                        if (shopRes && shopRes.code === '0') {
                            if (shopRes.data && shopRes.data.nutrState && shopRes.data.nutrState === '1') {
                                unFinishedShopNum--;
                            }
                        }
                        if (unFinishedShopNum <= 0) {
                            console.log(`${item.taskName}任务已做完\n`)
                            break;
                        }
                    }
                }
            }
            if (item.taskType === 5) {
                //挑选商品
                console.log(`开始做 ${item.taskName}任务`);
                let unFinishedProductNum = item.totalNum - item.gainedNum;
                if (unFinishedProductNum === 0) {
                    continue
                }
                await productTaskList();
                // console.log('productTaskList', $.productTaskList);
                const { data } = $.productTaskList;
                let productListARR = [], productList = [];
                const { productInfoList } = data;
                for (let i = 0; i < productInfoList.length; i++) {
                    for (let j = 0; j < productInfoList[i].length; j++) {
                        productListARR.push(productInfoList[i][j]);
                    }
                }
                for (let i of productListARR) {
                    if (i.taskState === '2') {
                        productList.push(i);
                    }
                }
                for (let product of productList) {
                    const { skuId, productTaskId } = product;
                    const body = {
                        "monitor_refer": "plant_productNutrientsTask",
                        "productTaskId": productTaskId,
                        "skuId": skuId
                    }
                    const productRes = await requestGet('productNutrientsTask', body);
                    if (productRes && productRes.code === '0') {
                        // console.log('nutrState', productRes)
                        //这里添加多重判断,有时候会出现活动太火爆的问题,导致nutrState没有
                        if (productRes.data && productRes.data.nutrState && productRes.data.nutrState === '1') {
                            unFinishedProductNum--;
                        }
                    }
                    if (unFinishedProductNum <= 0) {
                        console.log(`${item.taskName}任务已做完\n`)
                        break;
                    }
                }
            }
            if (item.taskType === 10) {
                //关注频道
                console.log(`开始做 ${item.taskName}任务`);
                let unFinishedChannelNum = item.totalNum - item.gainedNum;
                if (unFinishedChannelNum === 0) {
                    continue
                }
                await plantChannelTaskList();
                const { data } = $.plantChannelTaskList;
                // console.log('goodShopList', data.goodShopList);
                // console.log('moreShopList', data.moreShopList);
                let goodChannelListARR = [], normalChannelListARR = [], channelList = [];
                const { goodChannelList, normalChannelList } = data;
                for (let i of goodChannelList) {
                    if (i.taskState === '2') {
                        goodChannelListARR.push(i);
                    }
                }
                for (let j of normalChannelList) {
                    if (j.taskState === '2') {
                        normalChannelListARR.push(j);
                    }
                }
                channelList = goodChannelListARR.concat(normalChannelListARR);
                for (let channelItem of channelList) {
                    const { channelId, channelTaskId } = channelItem;
                    const body = {
                        "channelId": channelId,
                        "channelTaskId": channelTaskId
                    }
                    const channelRes = await requestGet('plantChannelNutrientsTask', body);
                    console.log(`channelRes结果:${JSON.stringify(channelRes)}`);
                    if (channelRes && channelRes.code === '0') {
                        if (channelRes.data && channelRes.data.nutrState && channelRes.data.nutrState === '1') {
                            unFinishedChannelNum--;
                        }
                    }
                    if (unFinishedChannelNum <= 0) {
                        console.log(`${item.taskName}任务已做完\n`)
                        break;
                    }
                }
            }
        }
    }
}

function showTaskProcess() {
    return new Promise(async resolve => {
        await plantBeanIndex();
        if ($.plantBeanIndexResult && $.plantBeanIndexResult.data) $.taskList = $.plantBeanIndexResult.data.taskList;
        if ($.taskList && $.taskList.length > 0) {
            console.log("     任务   进度");
            for (let item of $.taskList) {
                console.log(`[${item["taskName"]}]  ${item["gainedNum"]}/${item["totalNum"]}   ${item["isFinished"]}`);
            }
        }
        resolve()
    })
}

//助力好友
async function doHelp() {
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
        await helpShare(code);
        if ($.helpResult && $.helpResult.code === '0') {
            // console.log(`助力好友结果: ${JSON.stringify($.helpResult)}`);


            if ($.helpResult.data && $.helpResult.data.helpShareRes) {
                if ($.helpResult.data.helpShareRes.state === '1') {
                    console.log(`助力好友【${$.theName}】成功`)
                    console.log(`${$.helpResult.data.helpShareRes.promptText}\n`);
                } else if ($.helpResult.data.helpShareRes.state === '2') {
                    console.log(`助力好友【${$.theName}】失败，您今天助力次数已耗尽`);
                    console.log(`${$.helpResult.data.helpShareRes.promptText}\n`);
                    if (!$.helpRunout.includes($.index)) $.helpRunout.push($.index)
                    if ($.HelpOuts.helpOut.indexOf($.UserName) == -1) $.HelpOuts.helpOut.push($.UserName)
                    break;
                } else if ($.helpResult.data.helpShareRes.state === '3') {
                    console.log(` 该好友【${$.theName}】今日已满9人助力/20瓶营养液,明天再来为Ta助力吧`)
                    console.log(`${$.helpResult.data.helpShareRes.promptText}\n`);
                    if (checkArr($.myCodes, code) > -1) $.myCodes.splice(checkArr($.myCodes, code), 1) // 剔除助力已满的助力码
                    if (checkArr($.otherCodes, code) > -1) $.otherCodes.splice(checkArr($.otherCodes, code), 1) // 剔除助力已满的助力码
                    if ($.HelpOuts.helpFull.indexOf($.theName) == -1) $.HelpOuts.helpFull.push($.theName)
                } else if ($.helpResult.data.helpShareRes.state === '4') {
                    console.log(`助力好友【${$.theName}】失败`);
                    console.log(`${$.helpResult.data.helpShareRes.promptText}\n`)
                } else {
                    console.log(`助力其他情况：${JSON.stringify($.helpResult.data.helpShareRes)}\n`);
                }
            } else console.log(`助力好友失败1: ${JSON.stringify($.helpResult)}\n`);
        } else {
            console.log(`助力好友失败2: ${JSON.stringify($.helpResult)}\n`);
        }
    }
}

function showMsg() {
    $.log(`\n${message}\n`);
    jdNotify = $.getdata('jdPlantBeanNotify') ? $.getdata('jdPlantBeanNotify') : jdNotify;
    if (!jdNotify || jdNotify === 'false') {
        $.msg($.name, subTitle, message);
    }
}

// ================================================此处是API=================================
//每轮种豆活动获取结束后,自动收取京豆
async function getReward() {
    const body = {
        "roundId": lastRoundId
    }
    $.getReward = await request('receivedBean', body);
}

//收取营养液
async function cultureBean(currentRoundId, nutrientsType) {
    let functionId = arguments.callee.name.toString();
    let body = {
        "roundId": currentRoundId,
        "nutrientsType": nutrientsType,
    }
    $.cultureBeanRes = await request(functionId, body);
}

//偷营养液大于等于3瓶的好友
//①查询好友列表
async function stealFriendList() {
    const body = {
        pageNum: '1'
    }
    $.stealFriendList = await request('plantFriendList', body);
}

//②执行偷好友营养液的动作
async function collectUserNutr(paradiseUuid) {
    console.log('开始偷好友');
    // console.log(paradiseUuid);
    let functionId = arguments.callee.name.toString();
    const body = {
        "paradiseUuid": paradiseUuid,
        "roundId": currentRoundId
    }
    $.stealFriendRes = await request(functionId, body);
}

async function receiveNutrients() {
    $.receiveNutrientsRes = await request('receiveNutrients', { "roundId": currentRoundId, "monitor_refer": "plant_receiveNutrients" })
    // console.log(`定时领取营养液结果:${JSON.stringify($.receiveNutrientsRes)}`)
}

async function plantEggDoLottery() {
    $.plantEggDoLotteryResult = await requestGet('plantEggDoLottery');
}

//查询天天扭蛋的机会
async function egg() {
    $.plantEggLotteryRes = await requestGet('plantEggLotteryIndex');
}

async function productTaskList() {
    let functionId = arguments.callee.name.toString();
    $.productTaskList = await requestGet(functionId, { "monitor_refer": "plant_productTaskList" });
}
async function plantChannelTaskList() {
    let functionId = arguments.callee.name.toString();
    $.plantChannelTaskList = await requestGet(functionId);
    // console.log('$.plantChannelTaskList', $.plantChannelTaskList)
}

async function shopTaskList() {
    let functionId = arguments.callee.name.toString();
    $.shopTaskListRes = await requestGet(functionId, { "monitor_refer": "plant_receiveNutrients" });
    // console.log('$.shopTaskListRes', $.shopTaskListRes)
}

async function receiveNutrientsTask(awardType) {
    const functionId = arguments.callee.name.toString();
    const body = {
        "monitor_refer": "receiveNutrientsTask",
        "awardType": `${awardType}`,
    }
    $.receiveNutrientsTaskRes = await requestGet(functionId, body);
}

async function plantShareSupportList() {
    $.shareSupportList = await requestGet('plantShareSupportList', { "roundId": "" });
    if ($.shareSupportList && $.shareSupportList.code === '0') {
        const { data } = $.shareSupportList;
        //当日北京时间0点时间戳
        const UTC8_Zero_Time = parseInt((Date.now() + 28800000) / 86400000) * 86400000 - 28800000;
        //次日北京时间0点时间戳
        const UTC8_End_Time = parseInt((Date.now() + 28800000) / 86400000) * 86400000 - 28800000 + (24 * 60 * 60 * 1000);
        let friendList = [];
        data.map(item => {
            if (UTC8_Zero_Time <= item['createTime'] && item['createTime'] < UTC8_End_Time) {
                friendList.push(item);
            }
        })
        message += `【助力您的好友】共${friendList.length}人`;
    } else {
        console.log(`异常情况：${JSON.stringify($.shareSupportList)}`)
    }
}

//助力好友的api
async function helpShare(plantUuid) {
    // console.log(`\n开始助力好友: ${plantUuid}`);
    const body = {
        "plantUuid": plantUuid,
        "wxHeadImgUrl": "",
        "shareUuid": "",
        "followType": "1",
    }
    $.helpResult = await request(`plantBeanIndex`, body);
    console.log(`助力结果的code: ${$.helpResult && $.helpResult.code}`);
}

async function plantBeanIndex() {
    $.plantBeanIndexResult = await request('plantBeanIndex');//plantBeanIndexBody
}

//格式化助力码
function shareCodesFormat() {
    return new Promise(async resolve => {
        newShareCodes = [];
        if ($.myCodes.length > 0) for (let i of $.myCodes) newShareCodes.push(i)
        if (helpRandom + "" === "true") $.otherCodes = randomArr($.otherCodes) // 随机排序
        if ($.otherCodes.length > 0) for (let j of $.otherCodes) newShareCodes.push(j)
        resolve();
    })
}

function requireConfig() {
    return new Promise(resolve => {
        // console.log('开始获取种豆得豆配置文件\n')
        notify = $.isNode() ? require('./sendNotify') : '';
        //Node.js用户请在jdCookie.js处填写京东ck;
        const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
        const jdPlantBeanShareCodes = $.isNode() ? require('./jdPlantBeanShareCodes.js') : '';
        //IOS等用户直接用NobyDa的jd cookie
        if ($.isNode()) {
            Object.keys(jdCookieNode).forEach((item) => {
                if (jdCookieNode[item]) {
                    cookiesArr.push(jdCookieNode[item])
                }
            })
            if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => { };
        } else {
            cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
        }
        console.log(`共${cookiesArr.length}个京东账号\n\n============================================================`)
        console.log(`你的互助配置如下：\n互助模式：${helpRandom + "" === "true" ? '随机互助' : '顺序互助'}\n优先被助力账号：${$.myFronts.length > 0 ? $.myFronts.toString() : '未设定'}`);
        console.log(`\n环境变量设置提示：\nexport jd_helpFronts="1,2,3-5" 表示账号12345固定优先被助力\nexport jd_helpRandom="true" 表示固定助力过后全部随机助力、反之顺序助力`);
        console.log(`\n脚本先执行日常任务，最后再执行内部互助\n助力码直接脚本获取，解决助力码过长问题\n助力已满和耗尽的号，会缓存至本地以过滤`);
        console.log(`============================================================`)
        resolve()
    })
}

function requestGet(function_id, body = {}) {
    if (!body.version) {
        body["version"] = "9.0.0.1";
    }
    body["monitor_source"] = "plant_app_plant_index";
    body["monitor_refer"] = "";
    return new Promise(async resolve => {
        await $.wait(2000);
        const option = {
            url: `${JD_API_HOST}?functionId=${function_id}&body=${escape(JSON.stringify(body))}&appid=ld`,
            headers: {
                'Cookie': cookie,
                'Host': 'api.m.jd.com',
                'Accept': '*/*',
                'Connection': 'keep-alive',
                'User-Agent': 'JD4iPhone/167283 (iPhone;iOS 13.6.1;Scale/3.00)',
                'Accept-Language': 'zh-Hans-CN;q=1,en-CN;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Content-Type': "application/x-www-form-urlencoded"
            },
            timeout: 10000,
        };
        $.get(option, (err, resp, data) => {
            try {
                if (err) {
                    console.log('\n种豆得豆: API查询请求失败 ‼️‼️')
                    $.logErr(err);
                } else {
                    data = JSON.parse(data);
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve(data);
            }
        })
    })
}

function TotalBean() {
    return new Promise(async resolve => {
        const options = {
            "url": `https://wq.jd.com/user/info/QueryJDUserInfo?sceneval=2`,
            "headers": {
                "Accept": "application/json,text/plain, */*",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept-Encoding": "gzip, deflate, br",
                "Accept-Language": "zh-cn",
                "Connection": "keep-alive",
                "Cookie": cookie,
                "Referer": "https://wqs.jd.com/my/jingdou/my.shtml?sceneval=2",
                "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1")
            },
            "timeout": 10000,
        }
        $.post(options, (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if (data) {
                        data = JSON.parse(data);
                        if (data['retcode'] === 13) {
                            $.isLogin = false; //cookie过期
                            return
                        }
                        if (data['retcode'] === 0) {
                            $.nickName = (data['base'] && data['base'].nickname) || $.UserName;
                        } else {
                            $.nickName = $.UserName
                        }
                    } else {
                        console.log(`京东服务器返回空数据`)
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}

function request(function_id, body = {}) {
    return new Promise(async resolve => {
        await $.wait(2000);
        $.post(taskUrl(function_id, body), (err, resp, data) => {
            try {
                if (err) {
                    console.log('\n种豆得豆: API查询请求失败 ‼️‼️')
                    console.log(`function_id:${function_id}`)
                    $.logErr(err);
                } else {
                    data = JSON.parse(data);
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve(data);
            }
        })
    })
}

function taskUrl(function_id, body) {
    body["version"] = "9.2.4.0";
    body["monitor_source"] = "plant_app_plant_index";
    body["monitor_refer"] = "";
    return {
        url: JD_API_HOST,
        body: `functionId=${function_id}&body=${escape(JSON.stringify(body))}&appid=ld&client=apple&area=19_1601_50258_51885&build=167490&clientVersion=9.3.2`,
        headers: {
            "Cookie": cookie,
            "Host": "api.m.jd.com",
            "Accept": "*/*",
            "Connection": "keep-alive",
            "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
            "Accept-Language": "zh-Hans-CN;q=1,en-CN;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        timeout: 10000,
    }
}

function getParam(url, name) {
    const reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i")
    const r = url.match(reg)
    if (r != null) return unescape(r[2]);
    return null;
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

function generateArr(start, end) {
    return Array.from(new Array(end + 1).keys()).slice(start)
}

// 获取下标 和 判断是否存在
function checkArr(arr, val) {
    for (let p = 0; p < arr.length; p++) {
        if (arr[p][0] == val || arr[p][1] == val || arr[p][2] == val) {
            return p
        }
    }
    return -1
}

// 读取助力码
function getCodes(arr) {
    let codeStr = []
    for (let p of arr) codeStr.push(p[1])
    // codeStr = codeStr.toString()
    return codeStr
}

// 数组均衡随机排序
function randomArr(arr) {
    let i = arr.length;
    while (i) {
        let j = Math.floor(Math.random() * i--);
        [arr[j], arr[i]] = [arr[i], arr[j]];
    }
    return arr
}

// prettier-ignore
function Env(t, e) { "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0); class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
