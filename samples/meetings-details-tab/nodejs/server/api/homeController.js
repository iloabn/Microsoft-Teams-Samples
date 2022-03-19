const configuration = require('dotenv').config();
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

  taskInfo.maxVotes = result.reduce((total, part) => total + parseInt(Math.max(0,part.votes)), 0)

  console.log("DATA: ", taskInfo);

  const questionsTableClient = TableClient.fromConnectionString(process.env.TABLE_CONNECTION_STRING, "questions");
  await questionsTableClient.upsertEntity(taskInfo);

  const conversationID = conId;
  const serviceUrl = "https://smba.trafficmanager.net/emea/";
  console.log("SERVICE URL: ", serviceUrl);
  console.log("CONVERSATION ID: ", conversationID);
  const client = new ConnectorClient(credentials, { baseUri: serviceUrl });
  const adaptiveCard = createAdaptiveCard('Poll.json', data.taskInfo)
  try {
    MicrosoftAppCredentials.trustServiceUrl(serviceUrl);
    const result = await client.conversations.sendToConversation(conversationID,
      {
        type: 'message',
        from: { id: process.env.BotId },
        attachments: [adaptiveCard]
      });

    taskInfo.questionActivityId = result.id;
    await questionsTableClient.upsertEntity(taskInfo);

  }
  catch (e) {
    console.log(e.message);
  }
}

const getAgendaList = async (req, res) => {
  const conId = req.query.conversationId;

  const tableClient = TableClient.fromConnectionString(process.env.TABLE_CONNECTION_STRING, "questions");
  const votesTableClient = TableClient.fromConnectionString(process.env.TABLE_CONNECTION_STRING, "votes");

  const questionsCursor = tableClient.listEntities({
    queryOptions: { filter: `PartitionKey eq '${conId}'` }
  });
  console.log(`PartitionKey eq '${conId}'`);

  const result = [];
  for await (const question of questionsCursor) {
    const votesOnQuestionCursor = votesTableClient.listEntities({ queryOptions: { filter: `PartitionKey eq '${question.rowKey}'`}});

    question.option1Votes = 0;
    question.option2Votes = 0;

    for await(const vote of votesOnQuestionCursor) {
      if(question.option1 === vote.selection) {
        question.option1Votes += parseInt(vote.votes);
      } else if(question.option2 === vote.selection) {
        question.option2Votes += parseInt(vote.votes);
      }
    }

    result.push(question);
  }

  console.log("GET AGENDA LIST: ", JSON.stringify(result));
  await res.send(result);
}

const setAgendaList = async (req, res) => {
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
  res.status(200).end();
};

module.exports = {
  sendAgenda,
  getAgendaList,
  setAgendaList,
  getPartList,
  setPartList
}