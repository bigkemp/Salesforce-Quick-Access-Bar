const defaultSettings = {
   mypreferences:{
       linkOpenNewTab:true,
       alwaysShowCustoms:true,
       alwaysShowFavorites:true,
       enableFloatingBtn:true,
       enableHotKey:true,
   }
};
const menuItems = document.querySelectorAll('.menu-item');
const tabContents = document.querySelectorAll('.tab-content');

function activateTab(tab) {
  menuItems.forEach(item => item.classList.remove('active'));
  tab.classList.add('active');

  tabContents.forEach(content => content.classList.remove('active'));
  const tabContent = document.querySelector(`.tab-content[data-tab="${tab.dataset.tab}"]`);
  tabContent.classList.add('active');
}

menuItems.forEach(item => {
  item.addEventListener('click', () => {
    activateTab(item);
  });
});

activateTab(menuItems[0]);
var resetbtn = document.getElementById('sqab_ResetEverything');
resetbtn.onclick = doubleCheck;

var openModalbtn = document.getElementById('sqab_OpenMyModal');
openModalbtn.onclick = openMyModal;
var resetFinalebtn = document.getElementById('sqab_ResetEverythingFinale');
resetFinalebtn.onclick = resetEverything;

var ResetEverything_container = document.getElementById('sqab_ResetEverything_container');

var myloader = document.getElementById('sqab_loading-screen');
myloader.style.display = "none";

var mydoubleCheck = document.getElementById('sqab_doubleCheck');
mydoubleCheck.style.display = "none";

async function chromeStorageSet(type,data){
    await getData(type);
    let res = {[type]:data};
    await chrome.storage.sync.set(res);
    await getData(type);
}


function openMyModal(){
  let message = {
      text: "Wake Up!"
    };
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, message);
  });
}

function doubleCheck(){
    ResetEverything_container.style.display = "none";
    mydoubleCheck.style.display = "block";
}

async function resetEverything(){
    mydoubleCheck.style.display = "none";
    myloader.style.display = "block";
    if (navigator.userAgentData.platform.toLowerCase().includes('mac')) {
        defaultSettings["mypreferences"].HotKey = {code:75 ,name:"k"}
      } else {
        defaultSettings["mypreferences"].HotKey = {code:81 ,name:"q"}
      }
    await chromeStorageSet("mypreferences",defaultSettings["mypreferences"]);
    await chromeStorageSet("myorgs",[]);
    await chromeStorageSet("myshortcuts",[]);
    await chromeStorageSet("myobjs",[]);
    await chromeStorageSet("favorites",{});
    myloader.style.display = "none";
    alert("All Data was reset. Please refresh your page before using the modal again.");
    ResetEverything_container.style.display = "block";
}

async function getData(storageType){
    let data = await chrome.storage.sync.get(storageType);
    return data[storageType];
  }