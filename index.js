/* =====================================================
       FAST JOB CACHE
    ===================================================== */
    
    const JOB_CACHE_KEY =
        "select_salary_active_jobs_v2";
    
    const JOB_CACHE_TIME_KEY =
        "select_salary_active_jobs_time_v2";
    
    /*
     * Keep this aligned with Apps Script cache.
     * 5 minutes.
     */
    const JOB_CACHE_MAX_AGE =
        5 * 60 * 1000;
    
    
    /*
     * Small timeout only applies to the network request.
     *
     * IMPORTANT:
     * If cached jobs exist, the visitor does NOT wait
     * for this request.
     */
    const JOB_REQUEST_TIMEOUT =
        8000;
    
    
    /* =====================================================
       GLOBAL SELECTED JOB
    ===================================================== */
    
    let selectedJob = {
    
        id: "",
        title: ""
    
    };
    
    
    /* =====================================================
       DOM ELEMENTS
    ===================================================== */
    
    const candidateForm =
        document.getElementById(
            "candidateForm"
        );
    
    const submitBtn =
        document.getElementById(
            "submitBtn"
        );
    
    const messageBox =
        document.getElementById(
            "message"
        );
    
    const resumeInput =
        document.getElementById(
            "resume"
        );
    
    const fileNameBox =
        document.getElementById(
            "fileName"
        );
    
    
    /* =====================================================
       FAST JOB INITIALIZATION
    ===================================================== */
    
    document.addEventListener(
        "DOMContentLoaded",
        function(){
    
            /*
             * STEP 1
             *
             * Render cached jobs immediately.
             *
             * localStorage is synchronous, so there is
             * practically no network waiting here.
             */
            const cachedJobs =
                getCachedJobs();
    
    
            if(
                cachedJobs &&
                cachedJobs.length
            ){
    
                renderJobs(
                    cachedJobs
                );
    
            }
    
    
            /*
             * STEP 2
             *
             * Fetch latest jobs in background.
             *
             * The visitor does not wait for this if
             * cached jobs are already visible.
             */
            refreshJobsInBackground();
    
        }
    );
    
    
    /* =====================================================
       GET CACHED JOBS
    ===================================================== */
    
    function getCachedJobs(){
    
        try{
    
            const cached =
                localStorage.getItem(
                    JOB_CACHE_KEY
                );
    
    
            if(!cached){
    
                return null;
    
            }
    
    
            const jobs =
                JSON.parse(
                    cached
                );
    
    
            if(
                !Array.isArray(jobs)
            ){
    
                return null;
    
            }
    
    
            return jobs;
    
        }
    
        catch(error){
    
            console.warn(
                "Unable to read job cache:",
                error
            );
    
            return null;
    
        }
    
    }
    
    
    /* =====================================================
       SAVE JOBS TO CACHE
    ===================================================== */
    
    function saveJobsToCache(
        jobs
    ){
    
        try{
    
            localStorage.setItem(
                JOB_CACHE_KEY,
                JSON.stringify(jobs)
            );
    
    
            localStorage.setItem(
                JOB_CACHE_TIME_KEY,
                String(
                    Date.now()
                )
            );
    
        }
    
        catch(error){
    
            /*
             * Storage failure should never
             * stop the website.
             */
            console.warn(
                "Unable to save job cache:",
                error
            );
    
        }
    
    }
    
    
    /* =====================================================
       CHECK CACHE AGE
    ===================================================== */
    
    function isJobCacheFresh(){
    
        try{
    
            const timestamp =
                Number(
                    localStorage.getItem(
                        JOB_CACHE_TIME_KEY
                    )
                );
    
    
            if(!timestamp){
    
                return false;
    
            }
    
    
            return (
                Date.now() -
                timestamp
            ) < JOB_CACHE_MAX_AGE;
    
        }
    
        catch(error){
    
            return false;
    
        }
    
    }
    
    
    /* =====================================================
       REFRESH JOBS IN BACKGROUND
    ===================================================== */
    
    async function refreshJobsInBackground(){
    
        /*
         * If cache is fresh, jobs are already displayed.
         *
         * We still refresh in the background so that
         * new/removed jobs can appear without waiting
         * on the next page visit.
         */
    
        try{
    
            const jobs =
                await fetchLatestJobs();
    
    
            if(
                Array.isArray(jobs)
            ){
    
                saveJobsToCache(
                    jobs
                );
    
    
                /*
                 * Update the screen only if the
                 * server returned fresh data.
                 */
                renderJobs(
                    jobs
                );
    
            }
    
        }
    
        catch(error){
    
            console.warn(
                "Background job refresh failed:",
                error
            );
    
    
            /*
             * If cached jobs already exist,
             * KEEP showing them.
             *
             * Do not replace them with an
             * error message.
             */
            const cachedJobs =
                getCachedJobs();
    
    
            if(
                cachedJobs &&
                cachedJobs.length
            ){
    
                renderJobs(
                    cachedJobs
                );
    
                return;
    
            }
    
    
            /*
             * First-time visitor with no cache.
             */
            showJobLoadingError();
    
        }
    
    }
    
    
    /* =====================================================
       FETCH LATEST JOBS
    ===================================================== */
    
    function fetchLatestJobs(){
    
        return new Promise(
            function(resolve, reject){
    
                const controller =
                    new AbortController();
    
    
                const timeout =
                    setTimeout(
                        function(){
    
                            controller.abort();
    
                        },
                        JOB_REQUEST_TIMEOUT
                    );
    
    
                /*
                 * Cache-busting parameter.
                 *
                 * This prevents the browser from returning
                 * an old HTTP response while localStorage
                 * handles our instant display.
                 */
                const url =
                    SCRIPT_URL +
                    "?action=getActiveJobs" +
                    "&_=" +
                    Date.now();
    
    
                fetch(
                    url,
                    {
                        method: "GET",
    
                        cache: "no-store",
    
                        signal:
                            controller.signal
                    }
                )
    
                .then(
                    function(response){
    
                        if(
                            !response.ok
                        ){
    
                            throw new Error(
                                "Server returned " +
                                response.status
                            );
    
                        }
    
    
                        return response.json();
    
                    }
                )
    
                .then(
                    function(result){
    
                        clearTimeout(
                            timeout
                        );
    
    
                        if(
                            !result ||
                            !result.success
                        ){
    
                            throw new Error(
                                result &&
                                (
                                    result.message ||
                                    result.error
                                )
                                ||
                                "Unable to load jobs."
                            );
    
                        }
    
    
                        resolve(
                            result.jobs || []
                        );
    
                    }
                )
    
                .catch(
                    function(error){
    
                        clearTimeout(
                            timeout
                        );
    
                        reject(
                            error
                        );
    
                    }
                );
    
            }
        );
    
    }
    
    
    /* =====================================================
       SHOW INITIAL LOADING ERROR
    ===================================================== */
    
    function showJobLoadingError(){
    
        const container =
            document.getElementById(
                "jobsContainer"
            );
    
    
        container.innerHTML = `
    
            <div class="empty-jobs">
    
                <strong>
                    Unable to load jobs right now.
                </strong>
    
                <br><br>
    
                Please try again shortly.
    
            </div>
    
        `;
    
    }
    
    
    /* =====================================================
       RENDER JOBS
    ===================================================== */
    
    function renderJobs(
        jobs
    ){
    
        const container =
            document.getElementById(
                "jobsContainer"
            );
    
    
        if(
            !jobs ||
            jobs.length === 0
        ){
    
            container.innerHTML = `
    
                <div class="empty-jobs">
    
                    <strong>
                        No active jobs available right now.
                    </strong>
    
                    <br><br>
    
                    Please check again soon.
    
                </div>
    
            `;
    
            return;
    
        }
    
    
        /*
         * Build the entire HTML once.
         *
         * This is faster than repeatedly modifying
         * the DOM for individual jobs.
         */
    
        let html = "";
    
    
        for(
            let i = 0;
            i < jobs.length;
            i++
        ){
    
            html +=
                createJobCard(
                    jobs[i]
                );
    
        }
    
    
        container.innerHTML =
            html;
    
    }
    
    
    /* =====================================================
       CREATE JOB CARD
    ===================================================== */
    
    function createJobCard(
        job
    ){
    
        /*
         * IMPORTANT FIX
         *
         * Apps Script returns:
         *
         * jobId
         *
         * not:
         *
         * jobID
         */
    
        const jobId =
            job.jobId ||
            job.jobID ||
            "";
    
    
        const jobTitle =
            job.jobTitle ||
            "Job Opening";
    
    
        const companyName =
            job.companyName ||
            "Company";
    
    
        const employmentType =
            job.employmentType ||
            "Opportunity";
    
    
        const skills =
            String(
                job.skillsRequired ||
                ""
            )
            .split(",")
            .map(
                function(skill){
    
                    return skill.trim();
    
                }
            )
            .filter(
                function(skill){
    
                    return skill;
    
                }
            );
    
    
        let skillHTML = "";
    
    
        if(
            skills.length
        ){
    
            const limitedSkills =
                skills.slice(
                    0,
                    8
                );
    
    
            for(
                let i = 0;
                i < limitedSkills.length;
                i++
            ){
    
                skillHTML +=
                    `<span class="skill">${
                        escapeHTML(
                            limitedSkills[i]
                        )
                    }</span>`;
    
            }
    
        }
    
        else{
    
            skillHTML =
                `<span class="skill">
                    Multiple Skills
                 </span>`;
    
        }
    
    
        /*
         * Store job ID/title safely in the button.
         *
         * JSON.stringify is used so quotes in a
         * job title don't break the onclick.
         */
    
        const safeJobId =
            escapeAttribute(
                jobId
            );
    
    
        const safeJobTitle =
            escapeAttribute(
                jobTitle
            );
    
    
        return `
    
            <article class="job-card">
    
                <div class="job-title-area">
    
                    <div>
    
                        <div class="job-title">
                            ${escapeHTML(jobTitle)}
                        </div>
    
                        <div class="job-company">
                            ${escapeHTML(companyName)}
                        </div>
    
                    </div>
    
                    <div class="job-badge">
                        ${escapeHTML(employmentType)}
                    </div>
    
                </div>
    
    
                <div class="job-details">
    
                    ${
                        job.location
                        ? `
                            <span class="job-detail">
                                📍 ${escapeHTML(job.location)}
                            </span>
                          `
                        : ""
                    }
    
    
                    ${
                        job.experienceRequired
                        ? `
                            <span class="job-detail">
                                💼 ${escapeHTML(
                                    job.experienceRequired
                                )}
                            </span>
                          `
                        : ""
                    }
    
    
                    ${
                        job.salaryRange
                        ? `
                            <span class="job-detail">
                                💰 ${escapeHTML(
                                    job.salaryRange
                                )}
                            </span>
                          `
                        : ""
                    }
    
                </div>
    
    
                <div class="job-description">
    
                    ${escapeHTML(
                        job.jobDescription ||
                        "Please apply for more information about this opportunity."
                    )}
    
                </div>
    
    
                <div class="job-skills">
    
                    ${skillHTML}
    
                </div>
    
    
                <button
                    type="button"
                    class="apply-job-btn"
                    data-job-id="${safeJobId}"
                    data-job-title="${safeJobTitle}"
                >
    
                    Apply Now
    
                </button>
    
            </article>
    
        `;
    
    }
    
    
    /* =====================================================
       JOB BUTTON HANDLER
    ===================================================== */
    
    document.addEventListener(
        "click",
        function(event){
    
            const button =
                event.target.closest(
                    ".apply-job-btn"
                );
    
    
            if(!button){
    
                return;
    
            }
    
    
            const jobId =
                button.getAttribute(
                    "data-job-id"
                ) || "";
    
    
            const jobTitle =
                button.getAttribute(
                    "data-job-title"
                ) || "";
    
    
            applyForJob(
                jobId,
                jobTitle
            );
    
        }
    );
    
    
    /* =====================================================
       APPLY FOR JOB
    ===================================================== */
    
    function applyForJob(
        jobId,
        jobTitle
    ){
    
        selectedJob.id =
            jobId || "";
    
    
        selectedJob.title =
            jobTitle || "";
    
    
        document.getElementById(
            "selectedJobText"
        ).textContent =
            selectedJob.title;
    
    
        document.getElementById(
            "selectedJobBox"
        ).style.display =
            "block";
    
    
        document.getElementById(
            "register"
        ).scrollIntoView({
            behavior: "smooth"
        });
    
    }
    
    
    /* =====================================================
       RESUME FILE NAME
    ===================================================== */
    
    resumeInput.addEventListener(
        "change",
        function(){
    
            const file =
                this.files[0];
    
    
            if(!file){
    
                fileNameBox.textContent =
                    "";
    
                return;
    
            }
    
    
            const maxSize =
                10 * 1024 * 1024;
    
    
            const allowedExtensions = [
    
                ".pdf",
                ".doc",
                ".docx"
    
            ];
    
    
            const fileName =
                file.name.toLowerCase();
    
    
            const validExtension =
                allowedExtensions.some(
                    function(extension){
    
                        return fileName.endsWith(
                            extension
                        );
    
                    }
                );
    
    
            if(
                !validExtension
            ){
    
                this.value =
                    "";
    
                fileNameBox.textContent =
                    "";
    
                showMessage(
                    "Only PDF, DOC and DOCX files are allowed.",
                    "error"
                );
    
                return;
    
            }
    
    
            if(
                file.size >
                maxSize
            ){
    
                this.value =
                    "";
    
                fileNameBox.textContent =
                    "";
    
                showMessage(
                    "Resume must be 10 MB or smaller.",
                    "error"
                );
    
                return;
    
            }
    
    
            fileNameBox.textContent =
                "Selected: " +
                file.name;
    
        }
    );
    
    
    /* =====================================================
       MOBILE VALIDATION
    ===================================================== */
    
    document.getElementById(
        "mobile"
    ).addEventListener(
        "input",
        function(){
    
            this.value =
                this.value
                    .replace(
                        /[^0-9]/g,
                        ""
                    )
                    .substring(
                        0,
                        10
                    );
    
        }
    );
    
    
    /* =====================================================
       FORM SUBMIT
    ===================================================== */
    
    candidateForm.addEventListener(
        "submit",
        async function(event){
    
            event.preventDefault();
    
    
            hideMessage();
    
    
            const fullName =
                document.getElementById(
                    "fullName"
                )
                .value
                .trim();
    
    
            const mobile =
                document.getElementById(
                    "mobile"
                )
                .value
                .trim();
    
    
            const email =
                document.getElementById(
                    "email"
                )
                .value
                .trim()
                .toLowerCase();
    
    
            /* ---------------------------------------------
               VALIDATION
            --------------------------------------------- */
    
            if(!fullName){
    
                showMessage(
                    "Please enter your full name.",
                    "error"
                );
    
                return;
    
            }
    
    
            if(
                !/^[0-9]{10}$/.test(
                    mobile
                )
            ){
    
                showMessage(
                    "Please enter a valid 10-digit mobile number.",
                    "error"
                );
    
                return;
    
            }
    
    
            if(!email){
    
                showMessage(
                    "Please enter your email address.",
                    "error"
                );
    
                return;
    
            }
    
    
            if(
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    email
                )
            ){
    
                showMessage(
                    "Please enter a valid email address.",
                    "error"
                );
    
                return;
    
            }
    
    
            /* ---------------------------------------------
               RESUME
            --------------------------------------------- */
    
            const resumeFile =
                resumeInput.files[0];
    
    
            let resumeBase64 = "";
    
    
            if(resumeFile){
    
                if(
                    resumeFile.size >
                    10 * 1024 * 1024
                ){
    
                    showMessage(
                        "Resume must be 10 MB or smaller.",
                        "error"
                    );
    
                    return;
    
                }
    
    
                try{
    
                    resumeBase64 =
                        await fileToBase64(
                            resumeFile
                        );
    
                }
    
                catch(error){
    
                    console.error(
                        error
                    );
    
                    showMessage(
                        "Unable to read the resume file. Please try again.",
                        "error"
                    );
    
                    return;
    
                }
    
            }
    
    
            /* ---------------------------------------------
               PAYLOAD
               
               IMPORTANT:
               These names match the Apps Script backend.
            --------------------------------------------- */
    
            const payload = {
    
                action:
                    "registerCandidate",
    
    
                fullName:
                    fullName,
    
    
                mobile:
                    mobile,
    
    
                email:
                    email,
    
    
                location:
                    document.getElementById(
                        "location"
                    ).value.trim(),
    
    
                qualification:
                    document.getElementById(
                        "qualification"
                    ).value.trim(),
    
    
                experience:
                    document.getElementById(
                        "experience"
                    ).value,
    
    
                currentSalary:
                    document.getElementById(
                        "currentSalary"
                    ).value.trim(),
    
    
                expectedSalary:
                    document.getElementById(
                        "expectedSalary"
                    ).value.trim(),
    
    
                /*
                 * Backend currently expects
                 * jobRole.
                 */
                jobRole:
                    document.getElementById(
                        "jobRole"
                    ).value.trim(),
    
    
                employmentType:
                    document.getElementById(
                        "employmentType"
                    ).value,
    
    
                skills:
                    document.getElementById(
                        "skills"
                    ).value.trim(),
    
    
                preferredLocation:
                    document.getElementById(
                        "preferredLocation"
                    ).value.trim(),
    
    
                appliedJobId:
                    selectedJob.id,
    
    
                appliedJobTitle:
                    selectedJob.title,
    
    
                /*
                 * IMPORTANT RESUME FIX
                 *
                 * Apps Script expects:
                 *
                 * resumeBase64
                 * resumeFileName
                 *
                 * not:
                 *
                 * resume
                 */
    
                resumeBase64:
                    resumeBase64,
    
    
                resumeFileName:
                    resumeFile
                        ? resumeFile.name
                        : ""
    
            };
    
    
            /* ---------------------------------------------
               BUTTON
            --------------------------------------------- */
    
            submitBtn.disabled =
                true;
    
    
            submitBtn.textContent =
                resumeFile
                    ? "Uploading Resume & Registering..."
                    : "Submitting...";
    
    
            try{
    
                const response =
                    await fetch(
                        SCRIPT_URL,
                        {
    
                            method:
                                "POST",
    
                            headers:{
    
                                "Content-Type":
                                    "text/plain;charset=utf-8"
    
                            },
    
                            body:
                                JSON.stringify(
                                    payload
                                )
    
                        }
                    );
    
    
                const result =
                    await response.json();
    
    
                console.log(
                    "Registration response:",
                    result
                );
    
    
                if(
                    !result.success
                ){
    
                    throw new Error(
                        result.message ||
                        result.error ||
                        "Registration failed."
                    );
    
                }
    
    
                /* -----------------------------------------
                   SUCCESS
                ----------------------------------------- */
    
                candidateForm.style.display =
                    "none";
    
    
                document.getElementById(
                    "selectedJobBox"
                ).style.display =
                    "none";
    
    
                const successCard =
                    document.getElementById(
                        "successCard"
                    );
    
    
                successCard.style.display =
                    "block";
    
    
                document.getElementById(
                    "candidateID"
                ).textContent =
                    result.candidateId ||
                    result.candidateID ||
                    "CD-001";
    
    
                successCard.scrollIntoView({
                    behavior: "smooth"
                });
    
    
            }
    
            catch(error){
    
                console.error(
                    "Registration error:",
                    error
                );
    
    
                showMessage(
                    error.message ||
                    "Something went wrong. Please try again.",
                    "error"
                );
    
    
                submitBtn.disabled =
                    false;
    
    
                submitBtn.textContent =
                    "Submit Registration";
    
            }
    
        }
    );
    
    
    /* =====================================================
       FILE TO BASE64
    ===================================================== */
    
    function fileToBase64(
        file
    ){
    
        return new Promise(
            function(
                resolve,
                reject
            ){
    
                const reader =
                    new FileReader();
    
    
                reader.onload =
                    function(){
    
                        const result =
                            reader.result;
    
    
                        /*
                         * Remove:
                         *
                         * data:application/pdf;base64,
                         *
                         * and keep only Base64 data.
                         */
    
                        const base64 =
                            result
                                .split(",")[1];
    
    
                        resolve(
                            base64
                        );
    
                    };
    
    
                reader.onerror =
                    function(){
    
                        reject(
                            new Error(
                                "Unable to read file."
                            )
                        );
    
                    };
    
    
                reader.readAsDataURL(
                    file
                );
    
            }
        );
    
    }
    
    
    /* =====================================================
       MESSAGE
    ===================================================== */
    
    function showMessage(
        message,
        type
    ){
    
        messageBox.textContent =
            message;
    
    
        messageBox.className =
            "message " +
            type;
    
    
        messageBox.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    
    }
    
    
    function hideMessage(){
    
        messageBox.textContent =
            "";
    
    
        messageBox.className =
            "message";
    
    }
    
    
    /* =====================================================
       ESCAPE HTML
    ===================================================== */
    
    function escapeHTML(
        value
    ){
    
        return String(
            value || ""
        )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
    
    }
    
    
    /* =====================================================
       ESCAPE ATTRIBUTE
    ===================================================== */
    
    function escapeAttribute(
        value
    ){
    
        return String(
            value || ""
        )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        );
    
    }
    
    
    /* =====================================================
       OPTIONAL BACKGROUND REFRESH
    ===================================================== */
    
    /*
     * When the candidate keeps the page open for a while,
     * refresh jobs every 5 minutes.
     *
     * This happens silently in the background.
     */
    
    setInterval(
        function(){
    
            if(
                document.visibilityState ===
                "visible"
            ){
    
                refreshJobsInBackground();
    
            }
    
        },
        JOB_CACHE_MAX_AGE
    );
    
    
    /* =====================================================
       REFRESH WHEN USER RETURNS TO TAB
    ===================================================== */
    
    document.addEventListener(
        "visibilitychange",
        function(){
    
            if(
                document.visibilityState ===
                "visible"
            ){
    
                if(
                    !isJobCacheFresh()
                ){
    
                    refreshJobsInBackground();
    
                }
    
            }
    
        }
    );
