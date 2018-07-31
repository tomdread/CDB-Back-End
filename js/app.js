(function() {

  'use strict';

  var ENTER_KEY = 13;
  var newJobDom = document.getElementById('new-job');
  var syncDom = document.getElementById('sync-wrapper');

  // EDITING STARTS HERE (you dont need to edit anything above this line)

  var db = new PouchDB('jobs');
  var remoteCouch = 'http://192.168.43.95:5984/jobs';
  
  db.info(function(err, info) {
    db.changes({
      since: info.update_seq,
      live: true
    }).on('change', showJobs);
  });

  // We have to create a new job document and enter it in the database
  function addJob(text) {
    var job = {
      _id: new Date().toISOString(),
      title: text,
      completed: false
    };
    db.put(job).then(function (result) {
      console.log("everything is A-OK");
      console.log(result);
    }).catch(function (err) {
      console.log('everything is terrible');
      console.log(err);
    });
  }

  // Show the current list of jobs by reading them from the database
  function showJobs() {
    db.allDocs({include_docs: true, descending: true}).then(function(doc) {
      redrawJobsUI(doc.rows);
    }).catch(function (err) {
      console.log(err);
    });
  }

  function checkboxChanged(job, event) {
    job.completed = event.target.checked;
    console.log(job);
    db.put(job);
  }

  // User pressed the delete button for a job, delete it
  function deleteButtonPressed(job) {
    db.remove(job);
  }

  // The input box when editing a job has blurred, we should save
  // the new title or delete the job if the title is empty
  function jobBlurred(job, event) {
    var trimmedText = event.target.value.trim();
    if (!trimmedText) {
      db.remove(job);
    } else {
      job.title = trimmedText;
      db.put(job);
    }
  }

  // Initialise a sync with the remote server
  function sync() {
    syncDom.setAttribute('data-sync-state', 'syncing');
    
    var opts = {live: true};
    db.sync(remoteCouch, opts, syncError);
  }

  // EDITING STARTS HERE (you dont need to edit anything below this line)

  // There was some form or error syncing
  function syncError() {
    syncDom.setAttribute('data-sync-state', 'error');
  }

  // User has double clicked a job, display an input so they can edit the title
  function jobDblClicked(job) {
    var div = document.getElementById('li_' + job._id);
    var inputEditJob = document.getElementById('input_' + job._id);
    div.className = 'editing';
    inputEditJob.focus();
  }

  // If they press enter while editing an entry, blur it to trigger save
  // (or delete)
  function jobKeyPressed(job, event) {
    if (event.keyCode === ENTER_KEY) {
      var inputEditJob = document.getElementById('input_' + job._id);
      inputEditJob.blur();
    }
  }

  // Given an object representing a job, this will create a list item
  // to display it.
  function createJobListItem(job) {
    var checkbox = document.createElement('input');
    checkbox.className = 'toggle';
    checkbox.type = 'checkbox';
    checkbox.addEventListener('change', checkboxChanged.bind(this, job));

    var label = document.createElement('label');
    label.appendChild( document.createTextNode(job.title));
    label.addEventListener('dblclick', jobDblClicked.bind(this, job));

    var deleteLink = document.createElement('button');
    deleteLink.className = 'destroy';
    deleteLink.addEventListener( 'click', deleteButtonPressed.bind(this, job));

    var divDisplay = document.createElement('div');
    divDisplay.className = 'view';
    divDisplay.appendChild(checkbox);
    divDisplay.appendChild(label);
    divDisplay.appendChild(deleteLink);

    var inputEditJob = document.createElement('input');
    inputEditJob.id = 'input_' + job._id;
    inputEditJob.className = 'edit';
    inputEditJob.value = job.title;
    inputEditJob.addEventListener('keypress', jobKeyPressed.bind(this, job));
    inputEditJob.addEventListener('blur', jobBlurred.bind(this, job));

    var li = document.createElement('li');
    li.id = 'li_' + job._id;
    li.appendChild(divDisplay);
    li.appendChild(inputEditJob);

    if (job.completed) {
      li.className += 'complete';
      checkbox.checked = true;
    }

    return li;
  }

  function redrawJobsUI(jobs) {
    var ul = document.getElementById('job-list');
    ul.innerHTML = '';
    jobs.forEach(function(job) {
      ul.appendChild(createJobListItem(job.doc));
    });
  }

  function newJobKeyPressHandler( event ) {
    if (event.keyCode === ENTER_KEY) {
      addJob(newJobDom.value);
      newJobDom.value = '';
    }
  }

  function addEventListeners() {
    newJobDom.addEventListener('keypress', newJobKeyPressHandler, false);
  }

  addEventListeners();
  showJobs();

  if (remoteCouch) {
    sync();
  }

})();
