require('dotenv').config({ path:'./secret.env' });
const puppeteer = require('puppeteer');
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database
});

function delay(ms) {
    return new Promise(res => {
        setTimeout(res, ms)
    });
};

(async function solend_scrape() {
    const browser =  await puppeteer.launch({ headless: true, defaultViewport: null })
    const page = (await browser.pages())[0]
    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36");
    await page.goto('https://solend.fi/dashboard', {waitUntil: 'domcontentloaded'})

    // usually xhr requests occur shortly after, this works compared to waiting for a selector.
    await page.waitForNetworkIdle()

    // recalling the var to grab a new set of data does not work that way, even with a timeout.
    // therefore if/else or iterative methods revolving around 0 values may not work as intended.
    await delay(5000);

    console.log('Executing Solend scrape...')

    // data populates both name and price combined, substring removes the name and grabs the price without '$', trim removes the space at the end
    // all of this is converted into an integer
    // must use the first duplicate index referring to the price, otherwise returns incorrect value
    const solend_sol_price = await page.evaluate(() => parseFloat(document.querySelectorAll('div.ant-col')[44].textContent.substring(4).trimEnd()))

    // removes the % symbol and turns into an integer / 100 to indicate percentage (natively they round the % to an int, not a float)
    // removes the commas (separators) and turn into integer
    const solend_sol_supply= await page.evaluate(() => parseInt(document.querySelectorAll('div.ant-col')[52].textContent.replaceAll(',' , '')))
    const solend_sol_borrow = await page.evaluate(() => parseInt(document.querySelectorAll('div.ant-col')[55].textContent.replaceAll(',' , '')))

    // removes the % symbol and converts to float
    const solend_sol_supply_apy = await page.evaluate(() => parseFloat(document.querySelectorAll('div.ant-col')[58].textContent))

    // Date is associated as the same throughout to group instances into 1 per session of the scrape.
    // separating into multiple files creates new instances (may need to export same var instance)
    const date_raw = new Date();
    const date = date_raw.toLocaleDateString();

    // convert to 24 hr, bc am/pm makes data manipulating difficult
    const time = date_raw.toTimeString().substring(0,8)

    // gets the day of the week
    const dow = date_raw.toDateString().substring(0,3)

    // solend USDC

    // stablecoin, but utilizing float type to account for unpeg events
    const solend_usdc_price = await page.evaluate(() => parseFloat(document.querySelectorAll('div.ant-col')[63].textContent.substring(5).trimEnd()))
    const solend_usdc_supply = await page.evaluate(() => parseInt(document.querySelectorAll('div.ant-col')[70].textContent.replaceAll(',' , '')))
    const solend_usdc_borrow = await page.evaluate(() => parseInt(document.querySelectorAll('div.ant-col')[73].textContent.replaceAll(',' , '')))
    const solend_usdc_supply_apy = await page.evaluate(() => parseFloat(document.querySelectorAll('div.ant-col')[76].textContent))

    // solend USDT
    const solend_usdt_price = await page.evaluate(() => parseFloat(document.querySelectorAll('div.ant-col')[81].textContent.substring(5).trimEnd()))
    const solend_usdt_supply = await page.evaluate(() => parseInt(document.querySelectorAll('div.ant-col')[88].textContent.replaceAll(',' , '')))
    const solend_usdt_borrow = await page.evaluate(() => parseInt(document.querySelectorAll('div.ant-col')[91].textContent.replaceAll(',' , '')))
    const solend_usdt_supply_apy = await page.evaluate(() => parseFloat(document.querySelectorAll('div.ant-col')[94].textContent))


    const solend_sol = {
        name : 'sol',
        lending_protocol : 'solend',
        price : solend_sol_price,
        total_supply : solend_sol_supply,
        total_borrow : solend_sol_borrow,
        supply_apy : solend_sol_supply_apy,
        date : date,
        time : time,
        day_of_week : dow
    }

    const solend_usdc = {
        name : 'usdc',
        lending_protocol : 'solend',
        price : solend_usdc_price,
        total_supply : solend_usdc_supply,
        total_borrow : solend_usdc_borrow,
        supply_apy : solend_usdc_supply_apy,
        date : date,
        time : time,
        day_of_week : dow
    }

    const solend_usdt = {
        name : 'usdt',
        lending_protocol : 'solend',
        price : solend_usdt_price,
        total_supply : solend_usdt_supply,
        total_borrow : solend_usdt_borrow,
        supply_apy : solend_usdt_supply_apy,
        date : date,
        time : time,
        day_of_week : dow
    }

    let solend_data_bank = [];
    solend_data_bank.push(solend_sol, solend_usdc, solend_usdt)
    console.log(solend_data_bank)

    console.log('Finished Solend scraping!' + '\n')

    // await Promise(load_solend_data);
    // console.log('Added Solend data to db')

    const sol = solend_data_bank[0];
    const usdc = solend_data_bank[1];
    const usdt = solend_data_bank[2];

    connection.connect(err => {
        if (err) throw err;
        console.log('Database ' + `${process.env.database}` + ' connected.' + '\n')
        connection.query({
            sql : 'INSERT INTO test1 (name, lending_protocol, price) VALUES (?, ?, ?)',
            values : [
                sol.name, 
                sol.lending_protocol, 
                sol.price
            ]
        }, (err, res) => {
                if (err) throw err;
                console.log('Solend data inserted!')
                console.log('Affected rows: ' + res.affectedRows); 
        });
    });

    await browser.close()

}());

// (async function solend_load() {
//     const sol = solend_data_bank[0];
// const usdc = solend_data_bank[1];
// const usdt = solend_data_bank[2];
//     console.log(solend_data_bank)
//     await browser.close()
// }());


module.exports = { 
    'solend_scrape' : this.solend_scrape, 
    'solend_data_bank' : this.solend_data_bank
};
