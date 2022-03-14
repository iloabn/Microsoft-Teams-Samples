class Voter {
    constructor(Id, Name, Votes, ConversationId) {
        this.partitionKey = ConversationId;
        this.rowKey = Id;
        this.id = Id;
        this.name = Name;
        this.votes = Votes;
    }
}

module.exports = Voter;