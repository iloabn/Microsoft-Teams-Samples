const configuration = require('dotenv').config();
const store = require('../services/store')
const { createAdaptiveCard } = require('../services/AdaptiveCardService')
const { ConnectorClient, MicrosoftAppCredentials } = require('botframework-connector');
const { TableClient } = require("@azure/data-tables");
const credentials = new MicrosoftAppCredentials(process.env.BotId, process.env.BotPassword);

const sendAgenda = async (req) => {
  const data = req.body;

  const taskInfo = data.taskInfo;
  
  const conId = taskInfo.partitionKey;

  const tableClient = TableClient.fromConnectionString(process.env.TABLE_CONNECTION_STRING, "voters");

  const entities = tableClient.listEntities({
    queryOptions: { filter: `PartitionKey eq '${conId}'` }
  });
  const result = [];
  for await (const entity of entities) {
    result.push(entity);
  }

  taskInfo.maxVotes = result.reduce((total, part) => total + parseInt(part.votes), 0)

  console.log("DATA: ", taskInfo);

  const questionsTableClient = TableClient.fromConnectionString(process.env.TABLE_CONNECTION_STRING, "questions");
  questionsTableClient.upsertEntity(taskInfo);

  const conversationID = conId;
  const serviceUrl = "https://smba.trafficmanager.net/emea/";
  console.log("SERVICE URL: ", serviceUrl);
  console.log("CONVERSATION ID: ", conversationID);
  const client = new ConnectorClient(credentials, { baseUri: serviceUrl });
  const adaptiveCard = createAdaptiveCard('Poll.json', data.taskInfo)
  try {
    MicrosoftAppCredentials.trustServiceUrl(serviceUrl);
    await client.conversations.sendToConversation(conversationID,
      {
        type: 'message',
        from: { id: process.env.BotId },
        attachments: [adaptiveCard]
      });
  }
  catch (e) {
    console.log(e.message);
  }
}
const getAgendaList = async (req, res) => {
  const conId = req.query.conversationId;

  const tableClient = TableClient.fromConnectionString(process.env.TABLE_CONNECTION_STRING, "questions");

  const entities = tableClient.listEntities({
    queryOptions: { filter: `PartitionKey eq '${conId}'` }
  });
  console.log(`PartitionKey eq '${conId}'`);

  const result = [];
  for await (const entity of entities) {
    result.push(entity);
  }

  await res.send(result);
}
const setAgendaList = async (req, res) => {
  // store.setItem("agendaList", req.body);
  console.log("SET AGENDA LIST");
  console.log(req.body);
  const tableClient = TableClient.fromConnectionString(process.env.TABLE_CONNECTION_STRING, "questions");
  for (const entity of req.body) {
    tableClient.upsertEntity(entity);
  }
}

const getPartList = async (req, res) => {
  const conId = req.query.conversationId;

  const tableClient = TableClient.fromConnectionString(process.env.TABLE_CONNECTION_STRING, "voters");

  const entities = tableClient.listEntities({
    queryOptions: { filter: `PartitionKey eq '${conId}'` }
  });

  const result = [];
  for await (const entity of entities) {
    result.push(entity);
  }

  await res.send(result);
};
const setPartList = async (req, res) => {
  console.log(JSON.stringify(req.body));

  console.log("Trying to save a new value");
  const tableClient = TableClient.fromConnectionString(process.env.TABLE_CONNECTION_STRING, "voters");

  const entityToUpdate = await tableClient.getEntity(req.body.partitionKey, req.body.rowKey);
  entityToUpdate.votes = req.body.votes;

  await tableClient.upsertEntity(entityToUpdate);
  // const partyList = store.getItem("partList");
  // const indexOfParty = partyList.findIndex((x) => x.id == req.body.id);
  // partyList[indexOfParty].votes = req.body.votes;

  // console.log(JSON.stringify(partyList));
  // store.setItem("partList", partyList);
  res.status(200).end();
};

module.exports = {
  sendAgenda,
  getAgendaList,
  setAgendaList,
  getPartList,
  setPartList
}