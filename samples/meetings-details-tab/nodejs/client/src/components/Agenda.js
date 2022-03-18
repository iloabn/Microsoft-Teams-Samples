import * as microsoftTeams from "@microsoft/teams-js";
const Agenda = ({ title, option1, option2, Id, IsSend, option1Votes, option2Votes, maxVotes, taskList }) => {
    const sendAgenda = () => {
        const taskInfo = taskList.find(x => x.Id === Id);
        taskInfo.IsSend = true;
        fetch(process.env.REACT_APP_ApiUrl + "/api/sendAgenda", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ taskInfo, taskList }),
        })
    };
    const submitHandler = (err, result) => {
        return true;
    };
    const openResultModule = () => {
        const baseUrl = `https://${window.location.hostname}:${window.location.port}`;
        let taskInfo = {
            title: null,
            height: null,
            width: null,
            url: null,
            card: null,
            fallbackUrl: null,
            completionBotId: null,
        };
        taskInfo.url = baseUrl + "/Result?id=" + Id;
        taskInfo.title = "Result";
        taskInfo.height = "250";
        taskInfo.width = "500";
        taskInfo.fallbackUrl = taskInfo.url
        microsoftTeams.tasks.startTask(taskInfo, submitHandler);
    }
    if (!IsSend) {
        return (
            <div className="card agendaCard">
                <div className="card-body">
                    <h5 className="card-title">{title}</h5>
                    <input disabled="" type="radio" className="option1" id="option1" name="option1" value={option1} />
                    <label className="pollLabel" for="option1">{option1}</label><br />
                    <input disabled="" type="radio" className="option2" id="option2" name="option2" value={option2} />
                    <label className="pollLabel" for="option2">{option2}</label><br />
                </div>
                <div className="card-footer">
                    <button type="button" className="btn btn-primary" onClick={() => sendAgenda()}>Öppna röstning</button>
                </div>
            </div>
        )
    } else {        
        const total = maxVotes;
        const percentOption1 = total === 0 ? 0 : parseInt((option1Votes * 100) / total);
        const percentOption2 = total === 0 ? 0 : parseInt((option2Votes * 100) / total);

        return (
            <div class="card agendaCard">
                <div class="card-body">
                    <h5 class="card-title">{title}</h5>
                    <div className="voting-grid">
                        <span class="option1">{option1} ({option1Votes})</span>
                        <span class="option2">{option2} ({option2Votes})</span>
                        <div className="resultpercentage">
                            <span class="percentage1" style={{ width: `${percentOption1}%` }}>&ensp;</span>
                            <span class="percentagenone" style={{ width: `${(100 - percentOption1 - percentOption2)}%` }}>&ensp;</span>
                            <span class="percentage2" style={{ width: `${percentOption2}%` }}>&ensp;</span>
                        </div>
                    </div>
                </div>
                {/* <div class="card-footer">
                    <button type="button" class="btn btn-primary btnResult" onClick={() => openResultModule()}>Results</button>
                </div> */}
            </div>
        )
    }
};
export default Agenda;