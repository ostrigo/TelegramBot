const cfg = require('./config');
const SocksAgent = require('socks5-https-client/lib/Agent');
const fse = require('fs-extra');
const path = require('path');
const request = require('request');

const Calendar = require('telegraf-calendar-telegram');
const Extra = require('telegraf/extra');
const Markup = require('telegraf/markup');
const Telegraf = require('telegraf');

const socksAgent = new SocksAgent({
    socksHost: cfg.proxy.host,
    socksPort: cfg.proxy.port,
    socksUsername: cfg.proxy.login,
    socksPassword: cfg.proxy.psswd,
});
// create the bot
const bot = new Telegraf(cfg.token, {
    telegram: { agent: socksAgent }
});

bot.use(Telegraf.log());

const data = [
    { title: 'Соглашение о конфиденциальности б/н', regnum: 'Вх-1321/18', regdate: '07.09.2018', author: 'Журбинский Владимир' },
    { title: 'Акт сверки за 1 полугодие 2018', regnum: 'Вх-1318/18', regdate: '07.09.2018', author: 'Журбинский Владимир' },
    { title: 'О продлении действия льготного периода №231 от 30.08.2018', regnum: 'Вх-1309/18', regdate: '06.09.2018', author: 'Стриго Олег' },
    { title: 'Счета за август+ протокол согласования цены №4 от 01.08.2018', regnum: 'Вх-1285/18', regdate: '04.09.2018', author: 'Стриго Олег' },
    { title: 'Сертификаты + сопроводительное письмо №8310 от 16.08.2018', regnum: 'Вх-1211/18', regdate: '29.08.2018', author: 'Юферев Андрей' },
];

// instantiate the calendar
const calendar = new Calendar(bot, {
    startWeekDay: 1,
    weekDayNames: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    monthNames: [
        "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
        "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"
    ]
});

// listen for the selected date event
calendar.setDateListener((ctx, date) => ctx.reply(date));

bot.command('start', ({ from: { username, first_name, last_name }, reply }) => {
    return reply(`Добро пожаловать, ${first_name} ${last_name}! Ваш ID: @${username}`, Markup
        .keyboard([
            ['☰ Меню', '🔍 Поиск'], // Row1 with 2 buttons
            ['🎮 Отгул', '❓ Вопрос'], // Row2 with 2 buttons
            ['🆘 Техподдержка', '🤖 О чат-боте'] // Row2 with 2 buttons
        ])
        .oneTime()
        .resize()
        .extra()
    )
})

bot.hears(/меню/i, ctx => ctx.replyWithHTML('Здравствуйте!\nВас приветствует чат-бот внутренней справочной службы.\nДля оформления отгула, напишите <b>[отгул]</b>.\nДля оформления заявки в службу тех.поддержки, напишите <b>[техподдержка]</b> или <b>[поломка]</b>.'));
bot.hears(/вопрос/i, ctx => ctx.replyWithHTML('Опишите Ваш вопрос, максимально подробно.'));
bot.hears(/техподдержка|поломка/i, ctx => {
    ctx.replyWithHTML('Пожалуйста опишите ситуацию в формате:\nситуация: <i>[описание ситуации]</i>, критичность: <i>[плановая/средняя/высокая]</i>');
    bot.on('text', ctx => {
        fse.writeFile('./files/tbot_' + ctx.message.chat.id + '-' + ctx.message.message_id + '.json', JSON.stringify(ctx.update, null, 4), (err) => {
            if (err) {
                console.error(err);
                return;
            };
            console.log('*************** JSON file has been created ***************');
        });
        ctx.reply('Спасибо, ваша заявка принята!');
    });
});

bot.hears(/отгул/i, ctx => ctx.replyWithHTML('Пожалуйста опишите ситуацию в формате:\n<i>[причина отгула]</i>, с <i>[дата начала в формате ДД.ММ.ГГ]</i> до <i>[дата окончания в формате ДД.ММ.ГГ]</i>.\nПри выборе даты вы можете использовать команду [/calendar]'));
bot.hears(/о чат-боте/i, ctx => ctx.replyWithHTML('Я - бот-помощник для работы с СЭД на базе EOSfSP.\nПо всем вопросам обращаться:\nsupport@junicsoft.ru'));
bot.hears(/поиск/i, ctx => {
    ctx.replyWithHTML('Активные документы:');
    setTimeout(() => {
        data.forEach((item) => {
            ctx.replyWithHTML(`<a href="http://junicsoft.ru">${item.regnum}</a> от ${item.regdate}`);
        });
    }, 800);
});

// retreive the calendar HTML
bot.hears(/calendar/ig, ctx => {

    const today = new Date();
    const minDate = new Date();
    minDate.setMonth(today.getMonth() - 2);
    const maxDate = new Date();
    maxDate.setMonth(today.getMonth() + 2);

    ctx.reply('Выберите дату...', calendar.setMinDate(minDate).setMaxDate(maxDate).getCalendar())
});

// Handle sticker or photo update
bot.on(['sticker', 'photo'], (ctx) => {
    const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    bot.telegram.getFileLink(photoId).then(result => {
        const filename = 'tbot_' + ctx.message.chat.id + '-' + ctx.message.message_id + '.jpg';
        request.get({
            url: result,
            agentClass: SocksAgent,
            agentOptions: {
                socksHost: cfg.proxy.host,
                socksPort: cfg.proxy.port,
                socksUsername: cfg.proxy.login,
                socksPassword: cfg.proxy.psswd
            }
        })
        .on('error', function (err) {
            console.log(err);
        })
        .pipe(fse.createWriteStream(path.join('./files/', filename)));

    });
});

bot.startPolling();
bot.telegram.getMe().then((bot_informations) => {
    console.log('Bot information:');
    console.log(bot_informations);
    console.log('Server has initialized bot nickname. Nick: ' + bot_informations.username + '\r\n');
});