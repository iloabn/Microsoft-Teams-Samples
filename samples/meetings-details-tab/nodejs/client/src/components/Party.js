import { useState } from "react";
function Party(props) {
    const [currentVote, setCurrentVote] = useState(props.votes);
    const [personName] = useState(props.personName);
    const [saveDisabled, setSaveDisabled] = useState(true);

    const sendPartyUpdate = async (newVotes) => {
        setSaveDisabled(true);

        const partyInfo = props.partyList.find(x => x.id === props.id);
        partyInfo.votes = newVotes;
        fetch(process.env.REACT_APP_ApiUrl + "/api/sendPart", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(partyInfo),
        })
    };

    function handleVotesUpdate(e) {
        setCurrentVote(e.target.value);
        setSaveDisabled(false);
    }

    const bgColor = currentVote < 0 ? "lightcoral" : currentVote === 0 ? "lightseagreen" : "";

    return (
        <div className="card agendaCard" style={{ backgroundColor: bgColor }}>
            <div className="card-body">
                <h5 className="card-title">{personName}</h5>
                <label className="pollLabel" for="option1">Röster:</label><br />
                <input type="number" className="option1" name="option1" onChange={handleVotesUpdate} value={currentVote} />
            </div>
            <div className="card-footer">
                <button type="button" disabled={saveDisabled} className="btn btn-primary" onClick={() => sendPartyUpdate(currentVote)}>Justera röstlängd</button>
            </div>
        </div>
    )
};
export default Party;