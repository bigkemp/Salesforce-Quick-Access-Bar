var instanceHostname;
var sessionId;
const apiVer = '52.0';
init();

function init(){
  if (location.host.endsWith("my.salesforce.com") || location.host.endsWith("lightning.force.com") || location.host.endsWith("visualforce.com")) {
      chrome.runtime.sendMessage({message: "getSfHost", url: location.href}, sfHost => {
        if (sfHost) {
          getSession(sfHost);
        }
      });
    }
}

const responseMapConfig = {
  customMetadata: {
    idField: 'DurableId',
    labelField: (record,togglerValue) => {
      const nameField = togglerValue === "API" ? record.DeveloperName : record.MasterLabel;
      return record.NamespacePrefix ? `${record.NamespacePrefix} ${nameField}` : nameField;
    },
    query:`SELECT DurableId, DeveloperName, NamespacePrefix FROM EntityDefinition WHERE IsCustomSetting=false AND IsCustomizable=true AND QualifiedApiName LIKE '%__mdt'`,
    urlTemplate: (id) => `/lightning/setup/CustomMetadata/page?address=%2F${id}%3Fsetupid%3DCustomMetadata`
  },
  flows: {
    idField: 'Id',
    labelField: (record,togglerValue) => togglerValue == "API" ? record.DeveloperName : record.ActiveVersion.MasterLabel,
    query: `SELECT Id, ActiveVersion.MasterLabel FROM FlowDefinition WHERE ActiveVersion.ProcessType != null AND ActiveVersion.ProcessType != 'Workflow'`,
    urlTemplate: (id) => `/lightning/setup/Flows/page?address=%2F${id}%3FretUrl%3D%2Flightning%2Fsetup%2FFlows%2Fhome`
  },
  users: {
    idField: 'Id',
    labelField: 'Name',
    query:`SELECT Id, Name, Email FROM User`,
    urlTemplate: (id) => `/lightning/setup/ManageUsers/page?address=%2F${id}%3Fnoredirect%3D1%26isUserEntityOverride%3D1`
  },
  profiles: {
    idField: 'Id',
    labelField: 'Name',
    query: `SELECT Id, Name FROM Profile`,
    urlTemplate: (id) => `/lightning/setup/EnhancedProfiles/page?address=%2F${id}`
  },
  objs: {
    idField: 'DurableId',
    labelField: (record,togglerValue) => togglerValue == "API" ? record.QualifiedApiName : record.MasterLabel,
    query: `SELECT DurableId, QualifiedApiName FROM EntityDefinition WHERE IsCustomizable = true AND (NOT QualifiedApiName LIKE '%__mdt')`,
    urlTemplate: (id) => id
  },
  listviews: {
    idField: 'QualifiedApiName',
    labelField: (record,togglerValue) => togglerValue == "API" ? record.QualifiedApiName : record.MasterLabel,
    query: `SELECT DurableId, QualifiedApiName FROM EntityDefinition WHERE IsCustomizable = true AND (NOT QualifiedApiName LIKE '%__mdt')`,
    urlTemplate: (label) => label
  }
};


async function search(type) {
  const res = await rest(`/services/data/v${apiVer}/query/?q=${encodeURIComponent(responseMapConfig[type].query)}`);
  return convertResponseToMap(res, responseMapConfig[type]);
}

async function search_monitors() {
  const res = await rest(`/services/data/v${apiVer}/limits/`);
  return res;
}

function convertResponseToMap(response, { idField, labelField, urlTemplate }) {
  const defaults = [];
  const urls = {};

  if (response && response.records) {
    response.records.forEach(record => {
      const id = record[idField];
      const masterLabel = record[labelField];
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

export async function search(type,togglerValue){
  switch (type) {
    case "monitoring":
      return await search_monitors();
    case "flows":
    case "users":
    case "profiles":
    case "metadatas":
    case "objs":
    case "listviews":
      return await search(type,togglerValue);
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
