// Parses CSV of PIDs and get's persons vital stats and saves into json file
// Usage: node lookuppids.js

const neatCsv = require('neat-csv');
const fs = require('fs');
const fetch = require('node-fetch');
const Bottleneck = require("bottleneck/es5");

const limiter = new Bottleneck( { maxConcurrent: 1, minTime: 500 } );
const token = "67c0d34a-dce4-4b16-b160-377910b3829e-prod";

fs.readFile('./byu/test.csv', async (err, data) => {
	if (err) return console.error(err);

    let pids = await neatCsv(data);
    let persons = { people: []};

    for (let i = 0; i < pids.length; i++) {
        let url = 'https://api.familysearch.org/platform/tree/persons/'+pids[i].pid;

        limiter.schedule(() => fetch(url, { headers: { "Authorization": "Bearer "+token, "Accept": "Application/JSON" }}))
        .then(response => response.json())
        .then(json => {
            pids[i].name = json.persons[0].display.name;
            pids[i].lifespan = json.persons[0].display.lifespan;
            console.log(pids[i]);
            persons.people.push(pids[i]);

            // save json file
            if (i == pids.length-1) fs.writeFileSync("persons.json", JSON.stringify(persons));
        });

    };
});