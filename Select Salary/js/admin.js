/* =====================================================
   CONFIG
   ===================================================== */

const SESSION_KEY =
  "select_salary_admin_session_v5";


/* =====================================================
   STATE
   ===================================================== */

let adminPassword = "";

let candidates = [];

let jobs = [];

let stats = {};

let loading = false;

let jobsLoading = false;


/* =====================================================
   HELPERS
   ===================================================== */

function $(id){
  return document.getElementById(id);
}


function escapeHtml(value){

  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

}


function normalizeText(value){

  return String(value ?? "")
    .toLowerCase()
    .trim();

}


function showToast(message){

  const toast = $("toast");

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(
    window.__toastTimer
  );

  window.__toastTimer =
    setTimeout(function(){

      toast.classList.remove("show");

    },3000);

}


function setSyncText(text){

  $("syncText").textContent =
    text;

}


function setLoginError(message){

  const box =
    $("loginError");

  if(!message){

    box.style.display =
      "none";

    box.textContent =
      "";

    return;

  }

  box.textContent =
    message;

  box.style.display =
    "block";

}




/* =====================================================
   API URL
   ===================================================== */

function apiUrl(action, extra = {}){

  const url =
    new URL(SCRIPT_URL);

  url.searchParams.set(
    "action",
    action
  );


  Object.keys(extra).forEach(function(key){

    if(
      extra[key] !== undefined &&
      extra[key] !== null
    ){

      url.searchParams.set(
        key,
        String(extra[key])
      );

    }

  });


  /*
   * Cache buster.
   */

  url.searchParams.set(
    "_ts",
    Date.now()
  );


  return url.toString();

}


/* =====================================================
   JSONP GET
   ===================================================== */

function jsonpGet(
  action,
  extra = {},
  timeout = 20000
){

  return new Promise(function(resolve,reject){

    const callbackName =
      "__selectSalaryJsonp_" +
      Date.now() +
      "_" +
      Math.floor(
        Math.random()*100000
      );


    const script =
      document.createElement("script");


    let finished = false;


    function cleanup(){

      if(script.parentNode){

        script.parentNode.removeChild(
          script
        );

      }

      try{

        delete window[
          callbackName
        ];

      }catch(error){

        window[
          callbackName
        ] = undefined;

      }

    }


    const timer =
      setTimeout(function(){

        if(finished){
          return;
        }

        finished = true;

        cleanup();

        reject(
          new Error(
            "Request timed out. Please check your Apps Script deployment."
          )
        );

      },timeout);


    window[callbackName] =
      function(data){

        if(finished){
          return;
        }

        finished = true;

        clearTimeout(timer);

        cleanup();

        resolve(data);

      };


    script.onerror =
      function(){

        if(finished){
          return;
        }

        finished = true;

        clearTimeout(timer);

        cleanup();

        reject(
          new Error(
            "Unable to connect to Google Apps Script."
          )
        );

      };


    const params =
      Object.assign(
        {},
        extra,
        {
          callback:callbackName
        }
      );


    script.src =
      apiUrl(
        action,
        params
      );


    document.head.appendChild(
      script
    );

  });

}


/* =====================================================
   POST
   ===================================================== */
   async function postAction(payload){

    if(!payload || typeof payload !== "object"){
      throw new Error("Invalid API payload.");
    }
  
    const body =
      new URLSearchParams();
  
    Object.keys(payload)
      .forEach(function(key){
  
        const value =
          payload[key];
  
        if(
          value !== undefined &&
          value !== null
        ){
  
          body.append(
            key,
            String(value)
          );
  
        }
  
      });
  
  
    const response =
      await fetch(
        SCRIPT_URL,
        {
          method:"POST",
  
          headers:{
            "Content-Type":
              "application/x-www-form-urlencoded;charset=UTF-8"
          },
  
          body:
            body.toString()
        }
      );
  
  
    const text =
      await response.text();
  
  
    let data;
  
    try{
  
      data =
        JSON.parse(text);
  
    }catch(error){
  
      console.error(
        "Apps Script response:",
        text
      );
  
      throw new Error(
        "Invalid response from Apps Script: " +
        text.slice(0,500)
      );
  
    }
  
  
    if(
      !data ||
      data.success !== true
    ){
  
      throw new Error(
        data && data.error
          ? data.error
          : data && data.message
            ? data.message
            : "Apps Script request failed."
      );
  
    }
  
  
    return data;
  
  }
/* =====================================================
   NORMALIZE CANDIDATE
   ===================================================== */

function normalizeCandidate(c){

  c = c || {};


  return {

    rowNumber:
      Number(
        c.rowNumber || 0
      ),


    candidateId:
      c.candidateId ||
      c.candidateID ||
      c.id ||
      "",


    submissionDate:
      c.submissionDate || "",


    fullName:
      c.fullName || "",


    mobile:
      c.mobile || "",


    email:
      c.email || "",


    currentLocation:
      c.currentLocation ||
      c.location ||
      "",


    qualification:
      c.qualification || "",


    experience:
      c.experience || "",


    currentSalary:
      c.currentSalary || "",


    expectedSalary:
      c.expectedSalary || "",


    preferredJobRole:
      c.preferredJobRole ||
      c.jobRole ||
      "",


    employmentType:
      c.employmentType || "",


    skills:
      c.skills || "",


    preferredLocation:
      c.preferredLocation || "",


    status:
      c.status ||
      "New",


    adminNotes:
      c.adminNotes || "",


    lastContactDate:
      c.lastContactDate || "",


    updatedAt:
      c.updatedAt || "",


    appliedJobId:
      c.appliedJobId ||
      c.appliedJobID ||
      "",


    appliedJobTitle:
      c.appliedJobTitle ||
      "",


    resumeFileName:
      c.resumeFileName ||
      "",


    resumeFileId:
      c.resumeFileId ||
      "",


    resumeDriveUrl:
      c.resumeDriveUrl ||
      c.resumeUrl ||
      ""

  };

}


/* =====================================================
   NORMALIZE JOB
   ===================================================== */

function normalizeJob(j){

  j = j || {};


  return {

    rowNumber:
      Number(
        j.rowNumber || 0
      ),


    jobID:
      j.jobID ||
      j.jobId ||
      "",


    postedDate:
      j.postedDate || "",


    jobTitle:
      j.jobTitle ||
      j.title ||
      "",


    companyName:
      j.companyName ||
      j.company ||
      "",


    location:
      j.location ||
      "",


    employmentType:
      j.employmentType ||
      "",


    experienceRequired:
      j.experienceRequired ||
      "",


    salaryRange:
      j.salaryRange ||
      "",


    skillsRequired:
      j.skillsRequired ||
      j.skills ||
      "",


    jobDescription:
      j.jobDescription ||
      j.description ||
      "",


    status:
      j.status ||
      "",


    updatedAt:
      j.updatedAt ||
      ""

  };

}


/* =====================================================
   AUTHENTICATE
   ===================================================== */

async function authenticate(password){

  const data =
    await jsonpGet(
      "authenticate",
      {
        adminPassword:
          password
      }
    );


  if(
    !data ||
    data.success !== true ||
    data.authenticated !== true
  ){

    throw new Error(
      data && data.error
        ? data.error
        : "Authentication failed."
    );

  }


  return true;

}


/* =====================================================
   GET CANDIDATES
   ===================================================== */

async function getCandidates(){

  const data =
    await jsonpGet(
      "getCandidates",
      {
        adminPassword:
          adminPassword
      }
    );


  if(
    !data ||
    data.success !== true
  ){

    throw new Error(
      data && data.error
        ? data.error
        : "Unable to load candidates."
    );

  }


  const list =
    Array.isArray(data)
      ? data
      : (
        Array.isArray(data.candidates)
          ? data.candidates
          : []
      );


  return list.map(
    normalizeCandidate
  );

}


/* =====================================================
   GET JOBS
   ===================================================== */

async function getJobsFresh(){

  const data =
    await jsonpGet(
      "getJobs",
      {
        adminPassword:
          adminPassword,
        _refresh:"1"
      }
    );


  if(
    !data ||
    data.success !== true
  ){

    throw new Error(
      data && data.error
        ? data.error
        : "Unable to load jobs."
    );

  }


  const list =
    Array.isArray(data)
      ? data
      : (
        Array.isArray(data.jobs)
          ? data.jobs
          : []
      );


  return list.map(
    normalizeJob
  );

}


/* =====================================================
   LOAD DASHBOARD STATS
   ===================================================== */

async function getDashboardStats(){

  /*
   * We can derive dashboard statistics from
   * the candidate list.
   *
   * This avoids depending on a second request.
   */

  return calculateStats();

}


/* =====================================================
   CALCULATE STATS
   ===================================================== */

function calculateStats(){

  const result = {

    totalCandidates:
      candidates.length,

    newCandidates:0,

    contactedCandidates:0,

    shortlistedCandidates:0,

    rejectedCandidates:0,

    interviewCandidates:0,

    selectedCandidates:0,

    hiredCandidates:0,

    otherCandidates:0

  };


  candidates.forEach(function(c){

    const status =
      normalizeText(
        c.status
      );


    switch(status){

      case "new":

        result.newCandidates++;

        break;


      case "contacted":

        result.contactedCandidates++;

        break;


      case "shortlisted":

        result.shortlistedCandidates++;

        break;


      case "rejected":

        result.rejectedCandidates++;

        break;


      case "interview":

      case "interview scheduled":

      case "interviewed":

        result.interviewCandidates++;

        break;


      case "selected":

        result.selectedCandidates++;

        break;


      case "hired":

        result.hiredCandidates++;

        break;


      default:

        result.otherCandidates++;

    }

  });


  return result;

}


/* =====================================================
   RENDER STATS
   ===================================================== */

function renderStats(){

  stats =
    calculateStats();


  $("statTotal").textContent =
    stats.totalCandidates;


  $("statNew").textContent =
    stats.newCandidates;


  $("statJobs").textContent =
    jobs.filter(function(j){

      return normalizeText(
        j.status
      ) === "active";

    }).length;


  $("statShortlisted").textContent =
    stats.shortlistedCandidates;


  $("pipelineNew").textContent =
    stats.newCandidates;


  $("pipelineContacted").textContent =
    stats.contactedCandidates;


  $("pipelineShortlisted").textContent =
    stats.shortlistedCandidates;


  $("pipelineRejected").textContent =
    stats.rejectedCandidates;


  $("pipelineOther").textContent =
    stats.otherCandidates;

}


/* =====================================================
   STATUS BADGE
   ===================================================== */

function statusBadge(status){

  const value =
    String(
      status || "New"
    );


  const cls =
    normalizeText(value)
      .replace(/\s+/g,"-");


  let badgeClass =
    "badge-other";


  if(cls === "new")
    badgeClass =
      "badge-new";


  else if(cls === "contacted")
    badgeClass =
      "badge-contacted";


  else if(cls === "shortlisted")
    badgeClass =
      "badge-shortlisted";


  else if(cls === "rejected")
    badgeClass =
      "badge-rejected";


  return `
    <span class="badge ${badgeClass}">
      ${escapeHtml(value)}
    </span>
  `;

}


/* =====================================================
   RENDER LATEST
   ===================================================== */

function renderLatest(){

  const body =
    $("latestCandidatesBody");


  const latest =
    candidates.slice(
      0,
      8
    );


  if(!latest.length){

    body.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty">
            No candidates found.
          </div>
        </td>
      </tr>
    `;

    return;

  }


  body.innerHTML =
    latest.map(function(c){

      const applied =
        c.appliedJobTitle ||
        c.appliedJobId ||
        "Not specified";


      return `

        <tr>

          <td>
            <strong>
              ${escapeHtml(c.candidateId)}
            </strong>
          </td>


          <td>

            <div class="candidate-name">
              ${escapeHtml(c.fullName)}
            </div>

            <div class="candidate-email">
              ${escapeHtml(c.email)}
            </div>

          </td>


          <td>
            ${escapeHtml(c.currentLocation)}
          </td>


          <td>
            ${escapeHtml(c.experience)}
          </td>


          <td>
            ${escapeHtml(applied)}
          </td>


          <td>
            ${statusBadge(c.status)}
          </td>


          <td>

            <button
              class="small-btn btn-primary"
              onclick="openCandidate(${c.rowNumber})"
            >
              View
            </button>

          </td>

        </tr>

      `;

    }).join("");

}


/* =====================================================
   RENDER CANDIDATES
   ===================================================== */

function renderCandidates(){

  const body =
    $("candidateTableBody");


  const search =
    normalizeText(
      $("candidateSearch").value
    );


  const status =
    normalizeText(
      $("statusFilter").value
    );


  const experience =
    normalizeText(
      $("experienceFilter").value
    );


  const location =
    normalizeText(
      $("locationFilter").value
    );


  const role =
    normalizeText(
      $("roleFilter").value
    );


  const filtered =
    candidates.filter(function(c){

      const haystack =
        [
          c.candidateId,
          c.fullName,
          c.mobile,
          c.email,
          c.currentLocation,
          c.qualification,
          c.experience,
          c.currentSalary,
          c.expectedSalary,
          c.preferredJobRole,
          c.employmentType,
          c.skills,
          c.preferredLocation,
          c.status,
          c.appliedJobId,
          c.appliedJobTitle
        ]
        .join(" ")
        .toLowerCase();


      if(
        search &&
        !haystack.includes(search)
      ){

        return false;

      }


      if(
        status &&
        normalizeText(c.status) !== status
      ){

        return false;

      }


      if(
        experience &&
        normalizeText(c.experience) !== experience
      ){

        return false;

      }


      if(
        location &&
        !(
          normalizeText(
            c.currentLocation
          ).includes(location) ||
          normalizeText(
            c.preferredLocation
          ).includes(location)
        )
      ){

        return false;

      }


      if(
        role &&
        !normalizeText(
          c.preferredJobRole
        ).includes(role)
      ){

        return false;

      }


      return true;

    });


  if(!filtered.length){

    body.innerHTML = `

      <tr>

        <td colspan="10">

          <div class="empty">
            No matching candidates found.
          </div>

        </td>

      </tr>

    `;

    return;

  }


  body.innerHTML =
    filtered.map(function(c){

      const applied =
        c.appliedJobTitle ||
        c.appliedJobId ||
        "Not specified";


      const resume =
        c.resumeDriveUrl
          ? `
            <a
              href="${escapeHtml(c.resumeDriveUrl)}"
              target="_blank"
              rel="noopener"
              class="small-btn btn-light"
              style="text-decoration:none;display:inline-block;"
            >
              Open
            </a>
          `
          : `
            <span style="color:#999;">
              —
            </span>
          `;


      return `

        <tr>

          <td>
            <strong>
              ${escapeHtml(c.candidateId)}
            </strong>
          </td>


          <td>

            <div class="candidate-name">
              ${escapeHtml(c.fullName)}
            </div>

            <div class="candidate-email">
              ${escapeHtml(c.email)}
            </div>

          </td>


          <td>

            <div>
              ${escapeHtml(c.mobile)}
            </div>

            <div class="candidate-email">
              ${escapeHtml(c.email)}
            </div>

          </td>


          <td>
            ${escapeHtml(c.currentLocation)}
          </td>


          <td>
            ${escapeHtml(c.experience)}
          </td>


          <td>

            <div>
              ${escapeHtml(applied)}
            </div>

            ${
              c.appliedJobId
                ? `
                  <div class="candidate-email">
                    ${escapeHtml(c.appliedJobId)}
                  </div>
                `
                : ""
            }

          </td>


          <td>
            ${statusBadge(c.status)}
          </td>


          <td>
            ${resume}
          </td>


          <td>

            <button
              class="small-btn btn-primary"
              onclick="openCandidate(${c.rowNumber})"
            >
              View / Edit
            </button>

          </td>


          <td>

            <div class="action-buttons">

              <button
                class="small-btn btn-success"
                onclick="callCandidate('${encodeURIComponent(c.mobile)}')"
              >
                Call
              </button>

              <button
                class="small-btn btn-light"
                onclick="emailCandidate('${encodeURIComponent(c.email)}')"
              >
                Email
              </button>

              <button
                class="small-btn btn-light"
                onclick="openMeet()"
              >
                Meet
              </button>

            </div>

          </td>

        </tr>

      `;

    }).join("");

}


/* =====================================================
   RENDER JOBS
   ===================================================== */

function renderJobs(){

  const grid =
    $("jobsGrid");


  if(!jobs.length){

    grid.innerHTML = `

      <div
        class="empty"
        style="grid-column:1/-1;"
      >

        No jobs found in Google Sheets.

        <br><br>

        <button
          class="btn btn-primary"
          onclick="openAddJob()"
        >
          + Add First Job
        </button>

      </div>

    `;

    return;

  }


  grid.innerHTML =
    jobs.map(
      createJobCard
    ).join("");

}


/* =====================================================
   JOB CARD
   ===================================================== */

function createJobCard(job){

  const active =
    normalizeText(
      job.status
    ) === "active";


  return `

    <div class="job-card">

      <div
        style="display:flex;justify-content:space-between;gap:10px;"
      >

        <div>

          <h3>
            ${escapeHtml(job.jobTitle)}
          </h3>

          <div class="job-company">
            ${escapeHtml(job.companyName)}
          </div>

        </div>


        ${
          active
            ? `
              <span class="badge badge-shortlisted">
                Active
              </span>
            `
            : `
              <span class="badge badge-other">
                Inactive
              </span>
            `
        }

      </div>


      <div class="job-meta">

        ${
          job.jobID
            ? `
              <span>
                ${escapeHtml(job.jobID)}
              </span>
            `
            : ""
        }

        ${
          job.location
            ? `
              <span>
                📍 ${escapeHtml(job.location)}
              </span>
            `
            : ""
        }

        ${
          job.employmentType
            ? `
              <span>
                ${escapeHtml(job.employmentType)}
              </span>
            `
            : ""
        }

        ${
          job.experienceRequired
            ? `
              <span>
                ${escapeHtml(job.experienceRequired)}
              </span>
            `
            : ""
        }

        ${
          job.salaryRange
            ? `
              <span>
                ${escapeHtml(job.salaryRange)}
              </span>
            `
            : ""
        }

      </div>


      ${
        job.jobDescription
          ? `
            <div class="job-description">
              ${escapeHtml(job.jobDescription)}
            </div>
          `
          : ""
      }


      ${
        job.skillsRequired
          ? `
            <div class="job-skills">
              <strong>Skills:</strong>
              ${escapeHtml(job.skillsRequired)}
            </div>
          `
          : ""
      }


      <div
        style="font-size:11px;color:#999;margin-top:10px;"
      >
        Posted:
        ${escapeHtml(job.postedDate)}
      </div>


      <div class="job-actions">

        <button
          class="btn btn-light"
          onclick="editJob(${job.rowNumber})"
        >
          Edit
        </button>

        <button
          class="btn btn-danger"
          onclick="deleteJob(${job.rowNumber})"
        >
          Delete
        </button>

      </div>

    </div>

  `;

}


/* =====================================================
   OPEN CANDIDATE
   ===================================================== */

function openCandidate(rowNumber){

  const candidate =
    candidates.find(function(c){

      return Number(c.rowNumber) ===
        Number(rowNumber);

    });


  if(!candidate){

    showToast(
      "Candidate not found."
    );

    return;

  }


  $("candidateRowNumber").value =
    candidate.rowNumber;


  $("candidateStatus").value =
    candidate.status || "New";


  $("candidateLastContact").value =
    toDateInput(
      candidate.lastContactDate
    );


  $("candidateFullName").value =
    candidate.fullName;


  $("candidateMobile").value =
    candidate.mobile;


  $("candidateEmail").value =
    candidate.email;


  $("candidateLocation").value =
    candidate.currentLocation;


  $("candidateQualification").value =
    candidate.qualification;


  $("candidateExperience").value =
    candidate.experience;


  $("candidateCurrentSalary").value =
    candidate.currentSalary;


  $("candidateExpectedSalary").value =
    candidate.expectedSalary;


  $("candidateJobRole").value =
    candidate.preferredJobRole;


  $("candidateEmployment").value =
    candidate.employmentType;


  $("candidatePreferredLocation").value =
    candidate.preferredLocation;


  $("candidateAppliedJob").value =
    [
      candidate.appliedJobId,
      candidate.appliedJobTitle
    ]
    .filter(Boolean)
    .join(" — ");


  $("candidateSkills").value =
    candidate.skills;


  $("candidateNotes").value =
    candidate.adminNotes;


  const resume =
    $("candidateResume");


  if(candidate.resumeDriveUrl){

    resume.innerHTML = `

      <strong>
        ${escapeHtml(
          candidate.resumeFileName ||
          "Resume"
        )}
      </strong>

      <br><br>

      <a
        href="${escapeHtml(candidate.resumeDriveUrl)}"
        target="_blank"
        rel="noopener"
      >
        Open / Preview Resume
      </a>

      <br><br>

      <span style="font-size:11px;color:#777;">
        The file is stored in Google Drive.
      </span>

    `;

  }else{

    resume.innerHTML =
      "No resume uploaded.";

  }


  openModal(
    "candidateModal"
  );

}


/* =====================================================
   SAVE CANDIDATE
   ===================================================== */

async function saveCandidate(){

  const rowNumber =
    Number(
      $("candidateRowNumber").value
    );


  if(!rowNumber){

    showToast(
      "Invalid candidate."
    );

    return;

  }


  const button =
    $("saveCandidateBtn");


  button.disabled =
    true;


  button.textContent =
    "Saving...";


  try{

    const result =
      await postAction({

        action:
          "updateCandidate",

        adminPassword:
          adminPassword,

        rowNumber:
          rowNumber,

        fullName:
          $("candidateFullName").value,

        mobile:
          $("candidateMobile").value,

        email:
          $("candidateEmail").value,

        currentLocation:
          $("candidateLocation").value,

        qualification:
          $("candidateQualification").value,

        experience:
          $("candidateExperience").value,

        currentSalary:
          $("candidateCurrentSalary").value,

        expectedSalary:
          $("candidateExpectedSalary").value,

        preferredJobRole:
          $("candidateJobRole").value,

        employmentType:
          $("candidateEmployment").value,

        preferredLocation:
          $("candidatePreferredLocation").value,

        skills:
          $("candidateSkills").value,

        status:
          $("candidateStatus").value,

        adminNotes:
          $("candidateNotes").value,

        lastContactDate:
          $("candidateLastContact").value

      });


    closeModal(
      "candidateModal"
    );


    showToast(
      result.message ||
      "Candidate updated."
    );


    await refreshData(
      false
    );


  }catch(error){

    showToast(
      error.message
    );

  }finally{

    button.disabled =
      false;

    button.textContent =
      "Save Changes";

  }

}


/* =====================================================
   ADD JOB
   ===================================================== */

function openAddJob(){

  resetJobForm();

  $("jobModalTitle").textContent =
    "Add Job";

  openModal(
    "jobModal"
  );

}


/* =====================================================
   RESET JOB FORM
   ===================================================== */

function resetJobForm(){

  $("jobRowNumber").value =
    "";


  $("jobTitle").value =
    "";


  $("jobCompany").value =
    "";


  $("jobLocation").value =
    "";


  $("jobEmployment").value =
    "Full Time";


  $("jobExperience").value =
    "";


  $("jobSalary").value =
    "";


  $("jobSkills").value =
    "";


  $("jobDescription").value =
    "";


  $("jobStatus").value =
    "Active";

}


/* =====================================================
   EDIT JOB
   ===================================================== */

function editJob(rowNumber){

  const job =
    jobs.find(function(j){

      return Number(j.rowNumber) ===
        Number(rowNumber);

    });


  if(!job){

    showToast(
      "Job not found."
    );

    return;

  }


  $("jobRowNumber").value =
    job.rowNumber;


  $("jobTitle").value =
    job.jobTitle;


  $("jobCompany").value =
    job.companyName;


  $("jobLocation").value =
    job.location;


  $("jobEmployment").value =
    job.employmentType;


  $("jobExperience").value =
    job.experienceRequired;


  $("jobSalary").value =
    job.salaryRange;


  $("jobSkills").value =
    job.skillsRequired;


  $("jobDescription").value =
    job.jobDescription;


  $("jobStatus").value =
    job.status || "Active";


  $("jobModalTitle").textContent =
    "Edit Job";


  openModal(
    "jobModal"
  );

}


/* =====================================================
   SAVE JOB
   ===================================================== */

async function saveJob(){

  const rowNumber =
    Number(
      $("jobRowNumber").value
    );


  const action =
    rowNumber
      ? "updateJob"
      : "createJob";


  const button =
    $("saveJobBtn");


  button.disabled =
    true;


  button.textContent =
    "Saving...";


  try{

    const result =
      await postAction({

        action:
          action,

        adminPassword:
          adminPassword,

        rowNumber:
          rowNumber || undefined,

        jobTitle:
          $("jobTitle").value,

        companyName:
          $("jobCompany").value,

        location:
          $("jobLocation").value,

        employmentType:
          $("jobEmployment").value,

        experienceRequired:
          $("jobExperience").value,

        salaryRange:
          $("jobSalary").value,

        skillsRequired:
          $("jobSkills").value,

        jobDescription:
          $("jobDescription").value,

        status:
          $("jobStatus").value

      });


    closeModal(
      "jobModal"
    );


    showToast(
      result.message ||
      "Job saved."
    );


    await syncJobs(
      false
    );


    renderStats();


  }catch(error){

    showToast(
      error.message
    );

  }finally{

    button.disabled =
      false;

    button.textContent =
      "Save Job";

  }

}


/* =====================================================
   DELETE JOB
   ===================================================== */

async function deleteJob(rowNumber){

  const job =
    jobs.find(function(j){

      return Number(j.rowNumber) ===
        Number(rowNumber);

    });


  if(!job){

    showToast(
      "Job not found."
    );

    return;

  }


  const confirmed =
    confirm(
      "Delete " +
      job.jobTitle +
      "?\n\nThis will delete the job row from Google Sheets."
    );


  if(!confirmed){

    return;

  }


  try{

    const result =
      await postAction({

        action:
          "deleteJob",

        adminPassword:
          adminPassword,

        rowNumber:
          rowNumber

      });


    showToast(
      result.message ||
      "Job deleted."
    );


    await syncJobs(
      false
    );


    renderStats();


  }catch(error){

    showToast(
      error.message
    );

  }

}


/* =====================================================
   SYNC JOBS
   ===================================================== */

async function syncJobs(
  showMessage = true
){

  if(jobsLoading){

    return;

  }


  jobsLoading =
    true;


  $("syncJobsBtn").disabled =
    true;


  $("jobsSyncStatus").textContent =
    "Syncing with Google Sheets...";


  try{

    const freshJobs =
      await getJobsFresh();


    jobs =
      freshJobs;


    renderJobs();

    renderStats();


    $("jobsSyncStatus").textContent =
      "Synced successfully • " +
      new Date().toLocaleTimeString();


    if(showMessage){

      showToast(
        "Jobs synced successfully."
      );

    }


  }catch(error){

    $("jobsSyncStatus").textContent =
      "Sync failed: " +
      error.message;


    if(showMessage){

      showToast(
        error.message
      );

    }


  }finally{

    jobsLoading =
      false;

    $("syncJobsBtn").disabled =
      false;

  }

}


/* =====================================================
   REFRESH EVERYTHING
   ===================================================== */

async function refreshData(
  background = false
){

  if(loading){

    return;

  }


  loading =
    true;


  if(!background){

    setSyncText(
      "Refreshing..."
    );

  }


  try{

    const results =
      await Promise.all([

        getCandidates(),

        getJobsFresh()

      ]);


    candidates =
      results[0];


    jobs =
      results[1];


    renderStats();

    renderLatest();

    renderCandidates();

    renderJobs();


    setSyncText(
      "Synced • " +
      new Date().toLocaleTimeString()
    );


    if(!background){

      showToast(
        "Data refreshed successfully."
      );

    }


  }catch(error){

    setSyncText(
      "Sync failed"
    );


    showToast(
      error.message
    );


  }finally{

    loading =
      false;

  }

}


/* =====================================================
   SHOW PAGE
   ===================================================== */

function showPage(name){

  document
    .querySelectorAll(".page")
    .forEach(function(page){

      page.classList.remove(
        "active"
      );

    });


  document
    .querySelectorAll(".nav-button")
    .forEach(function(button){

      button.classList.remove(
        "active"
      );

    });


  const page =
    $(name + "Page");


  if(page){

    page.classList.add(
      "active"
    );

  }


  const nav =
    document.querySelector(
      '[data-page="' +
      name +
      '"]'
    );


  if(nav){

    nav.classList.add(
      "active"
    );

  }


  const titles = {

    dashboard:
      "Dashboard",

    candidates:
      "Candidates",

    jobs:
      "Jobs"

  };


  $("pageTitle").textContent =
    titles[name] ||
    "Admin Portal";


  if(name === "dashboard"){

    renderStats();

    renderLatest();

  }


  if(name === "candidates"){

    renderCandidates();

  }


  if(name === "jobs"){

    renderJobs();

  }

}


/* =====================================================
   SMART ASSIST
   ===================================================== */

function smartAssist(){

  const query =
    normalizeText(
      $("assistInput").value
    );


  if(!query){

    $("assistResult").textContent =
      "Enter something like: engineers from Mumbai";

    return;

  }


  const stopWords = [

    "show",
    "me",
    "find",
    "give",
    "list",
    "all",
    "the",
    "candidates",
    "candidate",
    "from",
    "with",
    "having",
    "who",
    "are",
    "is",
    "in",
    "for",
    "please",
    "people",
    "person"

  ];


  const tokens =
    query
      .split(/\s+/)
      .filter(Boolean)
      .filter(function(token){

        return stopWords.indexOf(
          token
        ) === -1;

      });


  if(!tokens.length){

    $("assistResult").textContent =
      "Please provide a useful search term.";

    return;

  }


  const matches =
    candidates.filter(function(c){

      const haystack =
        [
          c.fullName,
          c.currentLocation,
          c.preferredLocation,
          c.preferredJobRole,
          c.skills,
          c.experience,
          c.qualification,
          c.status,
          c.appliedJobTitle,
          c.employmentType
        ]
        .join(" ")
        .toLowerCase();


      return tokens.every(
        function(token){

          return haystack.includes(
            token
          );

        }
      );

    });


  $("assistResult").textContent =
    matches.length +
    " candidate(s) matched. Opening Candidates page.";


  /*
   * Open candidates page and put the
   * natural-language search into the main
   * search box.
   */

  showPage(
    "candidates"
  );


  $("candidateSearch").value =
    query;


  /*
   * The normal search box also uses all tokens,
   * which is useful for most Smart Assist queries.
   */

  renderCandidates();

}


/* =====================================================
   CALL
   ===================================================== */

function callCandidate(
  encodedMobile
){

  const mobile =
    decodeURIComponent(
      encodedMobile
    );


  if(!mobile){

    return;

  }


  window.location.href =
    "tel:" +
    mobile;

}


/* =====================================================
   EMAIL
   ===================================================== */

function emailCandidate(
  encodedEmail
){

  const email =
    decodeURIComponent(
      encodedEmail
    );


  if(!email){

    return;

  }


  window.location.href =
    "mailto:" +
    email;

}


/* =====================================================
   MEET
   ===================================================== */

function openMeet(){

  window.open(
    "https://meet.google.com/new",
    "_blank"
  );

}


/* =====================================================
   MODALS
   ===================================================== */

function openModal(id){

  $(id).classList.add(
    "show"
  );

}


function closeModal(id){

  $(id).classList.remove(
    "show"
  );

}


/* =====================================================
   DATE INPUT
   ===================================================== */

function toDateInput(value){

  if(!value){

    return "";

  }


  const text =
    String(value);


  /*
   * yyyy-MM-dd
   */

  const match =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );


  if(match){

    return (
      match[1] +
      "-" +
      match[2] +
      "-" +
      match[3]
    );

  }


  const date =
    new Date(value);


  if(
    isNaN(
      date.getTime()
    )
  ){

    return "";

  }


  return [
    date.getFullYear(),
    String(
      date.getMonth()+1
    ).padStart(2,"0"),
    String(
      date.getDate()
    ).padStart(2,"0")
  ].join("-");

}


/* =====================================================
   LOGIN
   ===================================================== */

async function login(){

  const password =
    $("password").value.trim();


  setLoginError(
    ""
  );


  if(!password){

    setLoginError(
      "Please enter the admin password."
    );

    return;

  }


  const button =
    $("loginBtn");


  button.disabled =
    true;


  button.textContent =
    "Connecting...";


  try{

    await authenticate(
      password
    );


    /*
     * Authentication succeeded.
     */

    adminPassword =
      password;


    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({

        password:
          password,

        timestamp:
          Date.now()

      })
    );


    $("loginScreen").classList.add(
      "hidden"
    );


    $("app").classList.remove(
      "hidden"
    );


    setSyncText(
      "Connected"
    );


    showToast(
      "Login successful."
    );


    /*
     * Immediately load fresh data.
     */

    await refreshData(
      false
    );


  }catch(error){

    setLoginError(
      error.message ||
      "Login failed."
    );


  }finally{

    button.disabled =
      false;

    button.textContent =
      "Login";

  }

}


/* =====================================================
   LOGOUT
   ===================================================== */

function logout(){

  adminPassword =
    "";


  candidates =
    [];


  jobs =
    [];


  sessionStorage.removeItem(
    SESSION_KEY
  );


  location.reload();

}


/* =====================================================
   RESTORE SESSION
   ===================================================== */

async function restoreSession(){

  try{

    const raw =
      sessionStorage.getItem(
        SESSION_KEY
      );


    if(!raw){

      return;

    }


    const session =
      JSON.parse(raw);


    if(
      !session ||
      !session.password
    ){

      return;

    }


    /*
     * Session is only used in this browser tab.
     *
     * Validate it against Apps Script.
     */

    await authenticate(
      session.password
    );


    adminPassword =
      session.password;


    $("loginScreen").classList.add(
      "hidden"
    );


    $("app").classList.remove(
      "hidden"
    );


    setSyncText(
      "Restoring..."
    );


    await refreshData(
      true
    );


  }catch(error){

    sessionStorage.removeItem(
      SESSION_KEY
    );


    adminPassword =
      "";

  }

}


/* =====================================================
   EVENT LISTENERS
   ===================================================== */

$("loginBtn")
  .addEventListener(
    "click",
    login
  );


$("password")
  .addEventListener(
    "keydown",
    function(event){

      if(
        event.key ===
        "Enter"
      ){

        login();

      }

    }
  );


$("logoutBtn")
  .addEventListener(
    "click",
    logout
  );


$("refreshBtn")
  .addEventListener(
    "click",
    function(){

      refreshData(
        false
      );

    }
  );


$("syncJobsBtn")
  .addEventListener(
    "click",
    function(){

      syncJobs(
        true
      );

    }
  );


$("addJobBtn")
  .addEventListener(
    "click",
    openAddJob
  );


$("saveJobBtn")
  .addEventListener(
    "click",
    saveJob
  );


$("saveCandidateBtn")
  .addEventListener(
    "click",
    saveCandidate
  );


$("assistBtn")
  .addEventListener(
    "click",
    smartAssist
  );


$("assistInput")
  .addEventListener(
    "keydown",
    function(event){

      if(
        event.key ===
        "Enter"
      ){

        smartAssist();

      }

    }
  );


document
  .querySelectorAll(
    ".assist-example"
  )
  .forEach(function(element){

    element.addEventListener(
      "click",
      function(){

        $("assistInput").value =
          element.dataset.query;

        smartAssist();

      }
    );

  });


document
  .querySelectorAll(
    ".nav-button"
  )
  .forEach(function(button){

    button.addEventListener(
      "click",
      function(){

        showPage(
          button.dataset.page
        );

      }
    );

  });


document
  .querySelectorAll(
    "[data-close]"
  )
  .forEach(function(button){

    button.addEventListener(
      "click",
      function(){

        closeModal(
          button.dataset.close
        );

      }
    );

  });


document
  .querySelectorAll(
    "#candidateSearch,#locationFilter,#roleFilter"
  )
  .forEach(function(input){

    input.addEventListener(
      "input",
      renderCandidates
    );

  });


document
  .querySelectorAll(
    "#statusFilter,#experienceFilter"
  )
  .forEach(function(input){

    input.addEventListener(
      "change",
      renderCandidates
    );

  });


$("clearFiltersBtn")
  .addEventListener(
    "click",
    function(){

      $("candidateSearch").value =
        "";

      $("statusFilter").value =
        "";

      $("experienceFilter").value =
        "";

      $("locationFilter").value =
        "";

      $("roleFilter").value =
        "";

      renderCandidates();

    }
  );


/*
 * Close modal by clicking outside it.
 */

document
  .querySelectorAll(".modal")
  .forEach(function(modal){

    modal.addEventListener(
      "click",
      function(event){

        if(
          event.target === modal
        ){

          modal.classList.remove(
            "show"
          );

        }

      }
    );

  });


/* =====================================================
   AUTO REFRESH
   ===================================================== */

setInterval(
  function(){

    if(
      adminPassword &&
      !document.hidden
    ){

      refreshData(
        true
      );

    }

  },
  5 * 60 * 1000
);


/* =====================================================
   VISIBILITY REFRESH
   ===================================================== */

document.addEventListener(
  "visibilitychange",
  function(){

    if(
      !document.hidden &&
      adminPassword
    ){

      refreshData(
        true
      );

    }

  }
);


/* =====================================================
   BOOT
   ===================================================== */

restoreSession();


/* ============================================================
   SELECT SALARY - CANDIDATE IMPORT / EXPORT
   ============================================================ */


/* ------------------------------------------------------------
   OPEN FILE PICKER
   ------------------------------------------------------------ */

   function openImportCandidates() {

    const fileInput = document.getElementById("candidateImportFile");

    if (!fileInput) {
        showToast(
            "Import file input not found.",
            "error"
        );
        return;
    }

    fileInput.value = "";
    fileInput.click();
}


/* ------------------------------------------------------------
   HANDLE SELECTED CSV FILE
   ------------------------------------------------------------ */

function handleCandidateImportFile(input) {

    if (!input || !input.files || !input.files.length) {
        return;
    }

    const file = input.files[0];

    if (!file.name.toLowerCase().endsWith(".csv")) {

        showToast(
            "Please select a CSV file.",
            "error"
        );

        input.value = "";
        return;
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {

        showToast(
            "CSV file is too large. Maximum size is 10 MB.",
            "error"
        );

        input.value = "";
        return;
    }


    const confirmed = confirm(
        "Import candidates from:\n\n" +
        file.name +
        "\n\n" +
        "Candidates will be added to the existing Candidates sheet.\n" +
        "Existing candidates will not be deleted.\n\n" +
        "Continue?"
    );


    if (!confirmed) {

        input.value = "";
        return;
    }


    const reader = new FileReader();


    reader.onload = function(event) {

        try {

            const csvData = event.target.result;


            if (!csvData || !csvData.trim()) {

                showToast(
                    "The selected CSV file is empty.",
                    "error"
                );

                input.value = "";
                return;
            }


            importCandidatesCSV(csvData);


        } catch (error) {

            console.error(
                "Candidate import file error:",
                error
            );

            showToast(
                "Unable to read the CSV file.",
                "error"
            );
        }

    };


    reader.onerror = function() {

        showToast(
            "Unable to read the selected file.",
            "error"
        );

    };


    reader.readAsText(file);
}



/* ============================================================
   SELECT SALARY - CANDIDATE CSV IMPORT
   ============================================================ */

async function importCandidatesCSV(csvData) {

    if (!csvData) {
        showToast(
            "No CSV data found."
        );
        return;
    }

    if (typeof postAction !== "function") {
        showToast(
            "Admin API function is not available."
        );

        console.error(
            "postAction() is missing."
        );

        return;
    }

    /* --------------------------------------------------------
       CHECK ADMIN AUTHENTICATION
       -------------------------------------------------------- */

    if (!adminPassword) {
        showToast(
            "Your admin session has expired. Please login again."
        );

        console.error(
            "Candidate import blocked: adminPassword is empty."
        );

        return;
    }

    try {

        showToast(
            "Importing candidates..."
        );

        /* ----------------------------------------------------
           IMPORTANT:
           postAction() accepts ONE payload object.

           The previous code incorrectly used:

           postAction(
               "importcandidates",
               {
                   csvData: csvData
               }
           );

           That caused the admin password to never reach
           Google Apps Script.

           We now send everything inside ONE object.
           ---------------------------------------------------- */

           const result = await postAction({
            action: "importcandidates",
            adminPassword: adminPassword,
            csvData: csvData
          });


        console.log(
            "Candidate import result:",
            result
        );


        if (!result) {

            throw new Error(
                "Empty response from server."
            );

        }


        if (result.success === true) {

            let message =
                result.message ||
                "Candidates imported successfully.";


            if (result.imported !== undefined) {

                message +=
                    " Imported: " +
                    result.imported;

            }


            if (result.skipped !== undefined) {

                message +=
                    " | Skipped: " +
                    result.skipped;

            }


            showToast(
                message
            );


            /* ------------------------------------------------
               REFRESH CANDIDATES

               IMPORTANT:
               The previous code called getCandidates()
               but did not assign the returned array.

               We now correctly update the global candidates
               variable.
               ------------------------------------------------ */

            try {

                const freshCandidates =
                    await getCandidates();

                candidates =
                    freshCandidates;

            } catch (refreshError) {

                console.error(
                    "Candidate refresh error:",
                    refreshError
                );

            }


            /* ------------------------------------------------
               REFRESH DASHBOARD / UI
               ------------------------------------------------ */

            try {

                renderStats();

            } catch (statsError) {

                console.error(
                    "Stats render error:",
                    statsError
                );

            }


            try {

                renderLatest();

            } catch (latestError) {

                console.error(
                    "Latest candidates render error:",
                    latestError
                );

            }


            try {

                renderCandidates();

            } catch (renderError) {

                console.error(
                    "Candidate render error:",
                    renderError
                );

            }


            /* ------------------------------------------------
               CLEAR FILE INPUT
               ------------------------------------------------ */

            const fileInput =
                document.getElementById(
                    "candidateImportFile"
                );

            if (fileInput) {
                fileInput.value = "";
            }


        } else {

            throw new Error(
                result.error ||
                result.message ||
                "Candidate import failed."
            );

        }


    } catch (error) {

        console.error(
            "Candidate import error:",
            error
        );


        showToast(
            error.message ||
            "Candidate import failed."
        );

    }

}



/* ------------------------------------------------------------
   EXPORT CANDIDATES
   ------------------------------------------------------------ */

async function exportCandidates() {

    try {

        if (
            typeof SCRIPT_URL === "undefined" ||
            !SCRIPT_URL
        ) {

            showToast(
                "Script URL is not configured.",
                "error"
            );

            return;
        }


        if (
            typeof adminPassword === "undefined" ||
            !adminPassword
        ) {

            showToast(
                "Please login again before exporting.",
                "error"
            );

            return;
        }


        showToast(
            "Preparing candidate export...",
            "info"
        );


        const url =
            SCRIPT_URL +
            "?action=exportcandidates" +
            "&password=" +
            encodeURIComponent(adminPassword) +
            "&_=" +
            Date.now();


        const response = await fetch(url, {
            method: "GET",
            cache: "no-store"
        });


        if (!response.ok) {

            throw new Error(
                "Server returned HTTP " +
                response.status
            );
        }


        const result = await response.json();


        console.log(
            "Candidate export result:",
            result
        );


        if (!result.success) {

            throw new Error(
                result.error ||
                result.message ||
                "Export failed."
            );
        }


        /*
         * The backend should return the CSV
         * in result.csv
         */

        const csv =
            result.csv ||
            result.data ||
            "";


        if (!csv) {

            throw new Error(
                "No candidate data was returned."
            );
        }


        /*
         * Create downloadable CSV file
         */

        const blob = new Blob(
            [csv],
            {
                type: "text/csv;charset=utf-8;"
            }
        );


        const downloadUrl =
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");


        link.href = downloadUrl;


        const date =
            new Date()
                .toISOString()
                .slice(0, 10);


        link.download =
            "Select-Salary-Candidates-" +
            date +
            ".csv";


        document.body.appendChild(link);


        link.click();


        document.body.removeChild(link);


        URL.revokeObjectURL(downloadUrl);


        showToast(
            "Candidates exported successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Candidate export error:",
            error
        );


        showToast(
            error.message ||
            "Unable to export candidates.",
            "error"
        );
    }
}


/* ------------------------------------------------------------
   DOWNLOAD IMPORT TEMPLATE
   ------------------------------------------------------------ */

async function downloadCandidateTemplate() {

    try {

        if (
            typeof SCRIPT_URL === "undefined" ||
            !SCRIPT_URL
        ) {

            showToast(
                "Script URL is not configured.",
                "error"
            );

            return;
        }


        if (
            typeof adminPassword === "undefined" ||
            !adminPassword
        ) {

            showToast(
                "Please login again.",
                "error"
            );

            return;
        }


        showToast(
            "Preparing import template...",
            "info"
        );


        const url =
            SCRIPT_URL +
            "?action=getcandidateimporttemplate" +
            "&password=" +
            encodeURIComponent(adminPassword) +
            "&_=" +
            Date.now();


        const response = await fetch(url, {
            method: "GET",
            cache: "no-store"
        });


        if (!response.ok) {

            throw new Error(
                "Server returned HTTP " +
                response.status
            );
        }


        const result =
            await response.json();


        if (!result.success) {

            throw new Error(
                result.error ||
                result.message ||
                "Unable to generate template."
            );
        }


        const csv =
            result.csv ||
            result.data ||
            "";


        if (!csv) {

            throw new Error(
                "Template data is empty."
            );
        }


        const blob = new Blob(
            [csv],
            {
                type: "text/csv;charset=utf-8;"
            }
        );


        const downloadUrl =
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");


        link.href = downloadUrl;


        link.download =
            "Select-Salary-Candidate-Import-Template.csv";


        document.body.appendChild(link);


        link.click();


        document.body.removeChild(link);


        URL.revokeObjectURL(downloadUrl);


        showToast(
            "Import template downloaded.",
            "success"
        );


    } catch (error) {

        console.error(
            "Template download error:",
            error
        );


        showToast(
            error.message ||
            "Unable to download template.",
            "error"
        );
    }
}