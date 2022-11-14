const demats = require('./config');
const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const prompt = require('prompt-sync')();
const cheerio = require('cheerio');

var driver = new webdriver.Builder()
  .withCapabilities(webdriver.Capabilities.chrome())
  // .setChromeOptions(new chrome.Options().headless())
  .build();

const login = async (demat) => {
  let loop = true;
  while (loop) {
    try {
      await driver.wait(
        webdriver.until.elementLocated(webdriver.By.name('selectBranch')),
        2000
      );
      loop = false;
    } catch (e) {
      loop = true;
      await driver.get('https://meroshare.cdsc.com.np/#/login');
    }
  }

  await driver.findElement(webdriver.By.name('selectBranch')).click();
  // Select Branch
  await driver
    .findElement(webdriver.By.className('select2-search__field'))
    .then((dpSearch) => {
      dpSearch.click();
      dpSearch.sendKeys(demat.dp).then(() => {
        dpSearch.sendKeys(webdriver.Key.ENTER);
      });
    });

  // Enter Username

  await driver
    .findElement(webdriver.By.name('username'))
    .sendKeys(demat.username);

  // Enter Password

  await driver
    .findElement(webdriver.By.name('password'))
    .sendKeys(demat.password);
  // Click Login

  await driver.findElement(webdriver.By.className('btn sign-in')).click();
  try {
    await driver.wait(webdriver.until.urlContains('#/dashboard'), 3000);
  } catch (e) {
    await login(demat);
  }

  console.log('Login successfully ✅');
};
const listIPOs = async () => {
  console.clear();
  console.log('Preparing ⏳');
  await login(demats[0]);
  console.log('Fetching available IPOs List ⏳');
  await driver
    .navigate()
    .to('https://meroshare.cdsc.com.np/#/asba')
    .then(async () => {
      await driver
        .wait(
          webdriver.until.elementLocated(
            webdriver.By.css('app-applicable-issue')
          )
        )
        .then(async () => {
          await driver
            .wait(
              webdriver.until.elementLocated(
                webdriver.By.className('company-name')
              ),
              5000
            )
            .then(async () => {
              await driver
                .findElements(webdriver.By.className('company-name'))
                .then(async (result) => {
                  let ipoList = await Promise.all(
                    result.map(async (item) => {
                      let data = await item.getAttribute('innerText');
                      return data.replace(/\n/g, ' ');
                    })
                  );
                  console.log('IPO list fetched successfully ✅');
                  showIPOList(ipoList);
                  const sn = prompt('Enter IPO S.N to apply :');
                  const units = prompt('Enter number of units to apply  :');
                  applyIPO(sn, units);
                });
            });
        });
    });
};
const showIPOList = (ipoList) => {
  console.log('\n');
  console.log('==> Available IPOs <== [' + ipoList.length + ']');
  console.log('\n');
  ipoList.forEach((ipo, index) => {
    console.log(`${index + 1}. ${ipo} `);
  });
  console.log('\n');
};
const showMenu = async () => {
  console.clear();
  console.log('\n');
  console.log('--> Bulk MeroShare Tool <--');
  console.log('\n');
  console.log('1. List Demat Accounts');
  console.log('2. Apply IPO');
  console.log('3. Check IPOs Status');
  console.log('4. Exit');
  console.log('\n');
  const input = prompt('> ');
  switch (input) {
    case '1':
      listDemats();
      break;
    case '2':
      await listIPOs();
      break;
    case '3':
      await checkStatus();
    case '4':
      driver.quit();
  }
};
const listDemats = async () => {
  console.clear();
  console.log('\n');
  console.log('==> Demat Accounts <==');
  console.log('\n');
  demats.forEach((demat) => {
    console.log(`-> ${demat.name} (${demat.username}) `);
  });
  console.log('\n');

  console.log('Press Enter to go back');
  const input = prompt('');
  await showMenu();
};
const applyIPO = async (sn, units) => {
  for (demat of demats) {
    console.log(`Applying IPO for ${demat.name} ⏳`);

    await login(demat);
    await driver.navigate().to('https://meroshare.cdsc.com.np/#/asba');

    await driver.wait(
      webdriver.until.elementLocated(webdriver.By.className('company-name')),
      10000
    );
    await driver
      .findElement(
        webdriver.By.xpath(
          `//*[@id="main"]/div/app-asba/div/div[2]/app-applicable-issue/div/div/div/div/div[${sn}]/div/div[2]/div/div[4]/button`
        )
      )
      .click();
    await driver.wait(
      webdriver.until.elementLocated(webdriver.By.name('selectBank')),
      10000
    );
    console.log('IPO form loaded 🚀');
    const bankOption = await driver.findElement(
      webdriver.By.name('selectBank')
    );
    await bankOption.click();
    const innerOptions = cheerio.load(
      await bankOption.getAttribute('innerHTML')
    );

    options = innerOptions('option');

    if (options.length < 3) {
      await bankOption.sendKeys(options.last().text());
    } else {
      await bankOption.sendKeys(options.last().text());
    }
    await driver.findElement(webdriver.By.name('appliedKitta')).sendKeys(units);
    await driver
      .findElement(webdriver.By.name('crnNumber'))
      .sendKeys(demat.crn);
    await driver.findElement(webdriver.By.name('disclaimer')).click();

    await driver
      .findElement(
        webdriver.By.xpath(
          "//*[@id='main']/div/app-issue/div/wizard/div/wizard-step[1]/form/div[2]/div/div[5]/div[2]/div/button[1]"
        )
      )
      .click();
    await driver
      .findElement(webdriver.By.name('transactionPIN'))
      .sendKeys(demat.tpin);
    await driver
      .findElement(
        webdriver.By.xpath(
          '//*[@id="main"]/div/app-issue/div/wizard/div/wizard-step[2]/div[2]/div/form/div[2]/div/div/div/button[1]'
        )
      )
      .click();
    await driver.wait(
      webdriver.until.elementLocated(webdriver.By.className('toast-message')),
      10000
    );
    const toastMessage = await driver
      .findElement(webdriver.By.className('toast-message'))
      .getAttribute('innerText');
    if (toastMessage.includes('success')) {
      console.log(`IPO applied successfully for ${demat.name}✅`);
    } else {
      console.log(toastMessage);
      console.log(`Error while applying IPO for ${demat.name} ❌`);
    }
    await driver
      .findElement(
        webdriver.By.xpath(
          '/html/body/app-dashboard/header/div[2]/div/div/div/ul/li[1]/a'
        )
      )
      .click();
  }
  console.log('Press Enter to go back');
  const input = prompt('');
  await showMenu();
};
const checkStatus = async () => {
  let statusUpdate = [];
  for (demat of demats) {
    const stat = {};
    console.log(`Checking IPO for status for ${demat.name} ⏳`);
    await login(demat);
    await driver.navigate().to('https://meroshare.cdsc.com.np/#/asba');
    await driver.wait(
      webdriver.until.elementLocated(webdriver.By.css('app-applicable-issue'))
    );
    await driver
      .findElement(
        webdriver.By.xpath(
          '//*[@id="main"]/div/app-asba/div/div[1]/div/div/ul/li[3]/a'
        )
      )
      .click();
    await driver.wait(
      webdriver.until.elementLocated(
        webdriver.By.xpath(
          '//*[@id="main"]/div/app-asba/div/div[2]/app-share-list/div/div/div[2]/div[1]/div[1]/div/div[2]/div/div[3]/button'
        )
      )
    );
    await driver
      .findElement(
        webdriver.By.xpath(
          '//*[@id="main"]/div/app-asba/div/div[2]/app-share-list/div/div/div[2]/div[1]/div[1]/div/div[2]/div/div[3]/button'
        )
      )
      .click();

    await driver.wait(
      webdriver.until.elementLocated(
        webdriver.By.xpath(
          '//*[@id="main"]/div/app-application-report/div/div[2]/div/div[1]/div/div/div/div/div/span[1]'
        )
      )
    );
    await driver.sleep(1 * 1000);
    console.log('IPO Status loaded  🚀');
    console.log('________________________________________');
    console.log(`${demat.name} Status :`);
    const IpoName = await driver
      .findElement(
        webdriver.By.xpath(
          '//*[@id="main"]/div/app-application-report/div/div[2]/div/div[1]/div/div/div/div/div/span[1]'
        )
      )
      .getAttribute('innerText');
    console.log('IPO Name: ', IpoName);

    await driver.wait(
      webdriver.until.elementLocated(
        webdriver.By.xpath(
          '//*[@id="main"]/div/app-application-report/div/div[2]/div/div[3]/div/div[1]/div[1]/div/div/div[2]/div/label'
        )
      )
    );

    const appliedQty = await driver
      .findElement(
        webdriver.By.xpath(
          '//*[@id="main"]/div/app-application-report/div/div[2]/div/div[3]/div/div[1]/div[1]/div/div/div[2]/div/label'
        )
      )
      .getAttribute('innerText');
    console.log('Applied Qty: ', appliedQty);

    await driver.wait(
      webdriver.until.elementLocated(
        webdriver.By.xpath(
          '//*[@id="main"]/div/app-application-report/div/div[2]/div/div[3]/div/div[1]/div[7]/div/div/div[2]/div/label'
        )
      )
    );

    const status = await driver
      .findElement(
        webdriver.By.xpath(
          '//*[@id="main"]/div/app-application-report/div/div[2]/div/div[3]/div/div[1]/div[7]/div/div/div[2]/div/label'
        )
      )
      .getAttribute('innerText');
    console.log('Status: ', status);

    await driver.wait(
      webdriver.until.elementLocated(
        webdriver.By.xpath(
          '//*[@id="main"]/div/app-application-report/div/div[2]/div/div[3]/div/div[1]/div[8]/div/div/div[2]/div/label'
        )
      )
    );

    const remarks = await driver
      .findElement(
        webdriver.By.xpath(
          '//*[@id="main"]/div/app-application-report/div/div[2]/div/div[3]/div/div[1]/div[8]/div/div/div[2]/div/label'
        )
      )
      .getAttribute('innerText');
    console.log('Remarks: ', remarks);
    console.log('________________________________________');
    console.log('\n');
    stat.name = demat.name;
    stat.IpoName = IpoName;
    stat.appliedQty = appliedQty;
    stat.status = status;
    stat.remarks = remarks;
    statusUpdate.push(stat);

    await driver
      .findElement(
        webdriver.By.xpath(
          '/html/body/app-dashboard/header/div[2]/div/div/div/ul/li[1]/a'
        )
      )
      .click();
  }

  console.log('\n');
  console.table(statusUpdate);
  console.log('Press Enter to go back');
  const input = prompt('');
  await showMenu();
};
const main = async () => {
  await showMenu();
};

main();
