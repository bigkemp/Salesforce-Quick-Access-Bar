var instanceHostname;
var sessionId;
const apiVer = '52.0';
init();

function init(){
  
  if (location.host.endsWith("my.salesforce.com") || location.host.endsWith("lightning.force.com") || location.host.endsWith("my.salesforce-setup.com") || location.host.endsWith("visualforce.com")) {
      chrome.runtime.sendMessage({message: "getSfHost", url: location.href}, sfHost => {
        if (sfHost) {
          getSession(sfHost);
        }
      });
    }
}

const responseMapConfig = {
  metadatas: {
    idField: 'DurableId',
    tooling:'',
    labelField: (record,togglerValue) => {
      const nameField = togglerValue === "API" ? record.DeveloperName : record.MasterLabel;
      return record.NamespacePrefix ? `${record.NamespacePrefix} ${nameField}` : nameField;
    },
    query:`SELECT DurableId, MasterLabel, DeveloperName, NamespacePrefix FROM EntityDefinition WHERE IsCustomSetting=false AND IsCustomizable=true AND QualifiedApiName LIKE '%__mdt'`,
    urlTemplate: (id) => `/lightning/setup/CustomMetadata/page?address=%2F${id}%3Fsetupid%3DCustomMetadata`
  },
  customsettings: {
    idField: 'DurableId',
    tooling:'',
    labelField: (record,togglerValue) => {
      const nameField = togglerValue === "API" ? record.DeveloperName : record.MasterLabel;
      return record.NamespacePrefix ? `${record.NamespacePrefix} ${nameField}` : nameField;
    },
    query:`SELECT DurableId, MasterLabel, DeveloperName, NamespacePrefix FROM EntityDefinition WHERE IsCustomSetting=true`,
    urlTemplate: (id) => `/lightning/setup/CustomSettings/page?address=%2Fsetup%2Fui%2FviewCustomSettings.apexp%3FappLayout%3Dsetup%26ltn_app_id%3D06m7Y000000GElTQAW%26setupid%3DCustomSettings%26sfdcIFrameHost%3Dweb%26clc%3D1%26id%3D${id}`
  },
  flows: {
    idField: 'Id',
    tooling:'tooling/',
    labelField: (record,togglerValue) => togglerValue == "API" ? record.DeveloperName : record.ActiveVersion.MasterLabel,
    query: `SELECT Id, DeveloperName, ActiveVersion.MasterLabel FROM FlowDefinition WHERE ActiveVersion.ProcessType != null AND ActiveVersion.ProcessType != 'Workflow'`,
    urlTemplate: (id) => `/lightning/setup/Flows/page?address=%2F${id}%3FretUrl%3D%2Flightning%2Fsetup%2FFlows%2Fhome`
  },
  users: {
    idField: 'Id',
    tooling:'',
    labelField: (record,togglerValue) => record.Name,
    query:`SELECT Id, Name, Email FROM User`,
    urlTemplate: (id) => `/lightning/setup/ManageUsers/page?address=%2F${id}%3Fnoredirect%3D1%26isUserEntityOverride%3D1`
  },
  profiles: {
    idField: 'Id',
    tooling:'',
    labelField: (record,togglerValue) => record.Name,
    query: `SELECT Id, Name FROM Profile`,
    urlTemplate: (id) => `/lightning/setup/EnhancedProfiles/page?address=%2F${id}`
  },
  objs: {
    idField: 'DurableId',
    tooling:'',
    labelField: (record,togglerValue) => togglerValue == "API" ? record.QualifiedApiName : record.MasterLabel,
    query: `SELECT DurableId,MasterLabel, QualifiedApiName FROM EntityDefinition WHERE IsCustomizable = true AND (NOT QualifiedApiName LIKE '%__mdt')`,
    urlTemplate: (id) => id
  },
  fields: {
    idField: '*',
    tooling:'',
    labelField: (record,togglerValue) =>  record.name,
    query: ``,
    urlTemplate: (id) => id
  },
  // records: {
  //   idField: 'Id',
  //   tooling:'',
  //   labelField: (record,togglerValue) => record,
  //   query: ``,
  //   urlTemplate: (id) => id
  // },
  listviews: {
    idField: 'QualifiedApiName',
    tooling:'',
    labelField: (record,togglerValue) => togglerValue == "API" ? record.QualifiedApiName : record.MasterLabel,
    query: `SELECT DurableId,MasterLabel, QualifiedApiName FROM EntityDefinition WHERE IsCustomizable = true AND (NOT QualifiedApiName LIKE '%__mdt')`,
    urlTemplate: (label) => label
  },
  connectedapps: {
    idField: 'Id',
    tooling:'tooling/',
    labelField: (record,togglerValue) => record.Name,
    query: `SELECT Id, Name, ContactEmail, Description, StartUrl FROM ConnectedApplication`,
    urlTemplate: (id) => `/lightning/setup/ConnectedApplication/page?address=%2Fapp%2Fmgmt%2Fforceconnectedapps%2FforceAppDetail.apexp%3FretURL%3D%252Fsetup%252FNavigationMenus%252Fhome%26connectedAppId%3D${id}`
  }
};


async function query(type,togglerValue) {
  const res = await rest(`/services/data/v${apiVer}/${responseMapConfig[type]?.tooling}query/?q=${encodeURIComponent(responseMapConfig[type].query)}`);
  return convertResponseToMap(res.records, responseMapConfig[type],togglerValue);
}

async function query_fields(data,togglerValue) {
  const res = await rest(`/services/data/v${apiVer}/sobjects/${data}/describe`);
  return convertResponseToMap(res.fields, responseMapConfig["fields"],togglerValue);
}

async function query_monitors() {
  const res = await rest(`/services/data/v${apiVer}/limits/`);
  return res;
}

function convertResponseToMap(response, { idField, labelField, urlTemplate }, togglerValue) {
  const defaults = [];
  const urls = {};
  if (response) {
    response.forEach(record => {
      const id = record[idField];
      const masterLabel = labelField(record,togglerValue);
      defaults.push({ name: masterLabel });
      if (masterLabel) {
        urls[masterLabel.replaceAll(" ", "-")] = urlTemplate(id);
      }
    });
  }
  return { defaults, urls };
}

async function getSession(sfHost) {

  let message = await new Promise(resolve => chrome.runtime.sendMessage({message: "getSession", sfHost}, resolve));
  if (message) {
    instanceHostname = message.hostname;
    sessionId = message.key;
  }
}

//TODO: need to support more then 2k records (next url from response)

export async function search_records(NoneToolingQuery){
  const res = await rest(`/services/data/v${apiVer}/${NoneToolingQuery?.tooling}query/?q=${encodeURIComponent(NoneToolingQuery.query)}`);
  if(res.totalSize == 0){
    return [];
  }else{
    return res.records;
  }
  //return await convertResponseToMap(res.records, responseMapConfig["records"],false);
}

export async function search(type,togglerValue, data = undefined){
  switch (type) {
    case "monitoring":
      return await query_monitors();
    case "fields":
      return await query_fields(data,togglerValue);
    case "flows":
    case "users":
    case "profiles":
    case "metadatas":
    case "connectedapps":
    case "objs":
    case "listviews":
    case "customsettings":
      return await query(type,togglerValue);
  }
}


async function rest(url, { logErrors = true, body = undefined } = {}) {
  try {
    if (!instanceHostname || !sessionId) {
      throw new Error("Session not found");
    }
    let method = "GET";
    let xhr = new XMLHttpRequest();
    url += (url.includes("?") ? "&" : "?") + "cache=" + Math.random();
    xhr.open(method, `https://${instanceHostname}${url}`, true);
    if (body !== undefined) {
      body = JSON.stringify(body);
      method = "POST";
      xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    }
    xhr.setRequestHeader("Accept", "application/json; charset=UTF-8");
    xhr.setRequestHeader("Authorization", `Bearer ${sessionId}`);
    xhr.responseType = "json";
    await new Promise((resolve, reject) => {
      xhr.onreadystatechange = () => {
        if (xhr.readyState == 4) {
          resolve();
        }
      };
      xhr.send(body);
    });

    if (xhr.status >= 200 && xhr.status < 300) {
      return xhr.response;
    } else {
      throw 'calling failed';
    }
  } catch (error) {
    throw error;
  }
}
