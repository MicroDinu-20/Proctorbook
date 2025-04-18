$(document).ready(function () {
    let assignProctorId = null;
    let selectedBatch = null;
    let selectedYear = null;
    let selectedProctorIdToRemove = null;
    let adminDepartment = null;
    // ========== MODAL CONTROLS ==========
    $('.close').click(() => $('.modal').hide());

    // Open Modals
    $('#import-student-button').click(() => $('#import-student-modal').show());
    $('#import-proctor-button').click(() => $('#import-proctor-modal').show());
    $('#add-subject-button').click(() => $('#addSubjectModal').show());
    $('#delete-subject-button').click(() => $('#deleteSubjectModal').show());
    $('#upload-subjects-button').click(() => $('#upload-subjects-modal').show());
    $('#edit-subjects-button').click(() => {
        loadBatches();
        $('#edit-subjects-modal').show();
    });

    // ========== IMPORT FORMS ==========
    function handleFileUpload(formId, url) {
        $(formId).on('submit', function (event) {
            event.preventDefault();
            let formData = new FormData(this);
            showLoader();
            $.ajax({
                type: 'POST',
                url: url,
                data: formData,
                processData: false,
                contentType: false,
                success: function () {
                    alert('Data imported successfully.');
                    $('.modal').hide();
                    hideLoader();
                },
                error: function (xhr) {
                    alert(xhr.responseText || 'Error importing data.');
                    hideLoader();
                }
            });
        });
    }

    handleFileUpload('#importStudentForm', '/importStudentData');
    handleFileUpload('#importProctorForm', '/importProctorData');

    // ========== ADD & DELETE SUBJECT ==========
    function handleFormSubmit(formId, url, successMessage) {
        $(formId).on('submit', function (event) {
            event.preventDefault();
            const formData = $(this).serialize();
            showLoader();
            $.post(url, formData)
                .done(response => {
                    alert(response.message || successMessage);
                    $('.modal').hide();
                    hideLoader();
                })
                .fail(() => alert('Error processing request.'));
                hideLoader();
        });
    }

    handleFormSubmit('#addSubjectForm', '/addSubject', 'Subject added successfully.');
    handleFormSubmit('#deleteSubjectForm', '/deleteSubject', 'Subject deleted successfully.');

    // ========== ASSIGN SUBJECTS ==========



    // Open Assign Subjects Modal
$('#assign-subjects-button').click(() => {
    showLoader(); // 🔥 Show loader before fetching data

    // Fetch admin department
    fetchAdminDepartment();

    // Fetch batches by department, then hide loader and show modal
    fetchBatchesByDepartment().then(() => {
        setTimeout(() => {
            console.log("Opening modal after ensuring dropdown is populated.");
            $('#assign-subjects-modal').show();
            hideLoader(); // 🔥 Hide loader once data is ready
        }, 200);  
    }).catch(error => {
        console.error("Error fetching batches:", error);
        hideLoader(); // 🔥 Hide loader even if there's an error
    });
});

    

    // Close Modal
    $('#close-assign-subjects-modal').click(() => {
        $('#assign-subjects-modal').hide();
    });

    // Fetch Admin's Department from Session (if not already fetched)
    function fetchAdminDepartment() {
        showLoader();
        if (adminDepartment) return; // Avoid multiple requests if already fetched

        $.ajax({
            type: 'GET',
            url: '/getAdminDepartment',
            success: function (data) {
                adminDepartment = data.department;
                $('#admin-department').text(adminDepartment);
                hideLoader();
            },
            error: function () {
                alert("Error fetching admin department.");
                hideLoader();
            }
        });
    }

    // Fetch Batches for Admin's Department
    function fetchBatchesByDepartment() {
        
        $.ajax({
            type: 'GET',
            url: '/getBatchesByDepartment',
            success: function (data) {
                console.log("Batches received for dropdown:", data);
    
                let batchSelect = $('#assign-batch-select2');
    
                if (batchSelect.length === 0) {
                    console.error("Dropdown element #assign-batch-select2 not found!");
                    return;
                }
    
                batchSelect.empty();
                batchSelect.append('<option value="">Select Batch</option>');
    
                if (!Array.isArray(data) || data.length === 0) {
                    console.warn("No batches available for department.");
                    alert("No batches available for your department.");
                    return;
                }
    
                data.forEach(batch => {
                    console.log("Appending batch:", batch.batch);  // 🔥 Log each batch
                    batchSelect.append(`<option value="${batch.batch}">${batch.batch}</option>`);
                });
    
                console.log("Dropdown final HTML after update:", batchSelect.html());  // 🔥 Log final dropdown content
            },
            error: function (xhr) {
                console.error("Error fetching department-specific batches:", xhr.responseText);
                alert("Error fetching department-specific batches.");
            }
        });
    }
    
    
    
    

    // Assign Subjects
    $('#confirm-assign-subjects').click(() => {
        selectedBatch = $('#assign-batch-select2').val();

        if (!selectedBatch) {
            alert("Please select a batch.");
            return;
        }

        $.ajax({
            type: 'POST',
            url: '/assignSubjectsByDepartment',
            contentType: 'application/json',
            data: JSON.stringify({ department_id: adminDepartment, batch: selectedBatch }),
            success: function (response) {
                alert(response.message || "Subjects assigned successfully!");
                $('#assign-subjects-modal').hide();
            },
            error: function (xhr) {
                alert(xhr.responseText || "Error assigning subjects.");
            }
        });
    });



    
    // ========== UPDATE ALL STUDENT MARKS ==========
    // $('#update-all-marks-button').click(() => {
    //     $.ajax({
    //         type: 'POST',
    //         url: '/updateAllStudentMarks',
    //         contentType: 'application/json',
    //         success: function (response) {
    //             alert(response.message || "Marks updated successfully!");
    //         },
    //         error: function (xhr) {
    //             alert(xhr.responseText || "Error updating marks.");
    //         }
    //     });
    // });

    // ========== ASSIGN PROCTOR ==========

    
        // ========== STEP 1: Open Proctor Selection Modal ==========
        $('#assign-proctor-button').click(() => {
            $.ajax({
                type: 'GET',
                url: '/getProctorsByDepartment',
                success: function (data) {
                    console.log("Received Proctor Data:", data); // 🔥 Debugging log
                    if (!Array.isArray(data)) {
                        alert("Error: Unexpected response format from server.");
                        return;
                    }
    
                    let tbody = $('#assign-proctor-table tbody');
                    tbody.empty();
                    data.forEach(proctor => {
                        tbody.append(`
                            <tr data-proctorid="${proctor.proctor_id}">
                                <td>${proctor.name}</td>
                                <td>${proctor.designation}</td>
                                <td>${proctor.department}</td>
                                <td><input type="radio" name="proctor-select" value="${proctor.proctor_id}"></td>
                            </tr>
                        `);
                    });
    
                    $('#assign-proctor-selection-modal').show();
                },
                error: function () {
                    alert("Error fetching proctors.");
                }
            });
        });
    
        // ========== STEP 2: Confirm Proctor Selection ==========
        $('#confirm-assign-proctor').click(() => {
            assignProctorId = $('input[name="proctor-select"]:checked').val();
            console.log("Selected Proctor ID:", assignProctorId); // 🔥 Debugging log
    
            if (!assignProctorId) {
                alert("Please select a proctor.");
                return;
            }
    
            $('#assign-proctor-selection-modal').hide();
    
            $.ajax({
                type: 'GET',
                url: '/getUniqueBatches',
                success: function (data) {
                    console.log("Received Batches:", data); // 🔥 Debugging log
                    let batchSelect = $('#assign-batch-select');
                    batchSelect.empty().append('<option value="">Select Batch</option>');
                    data.forEach(batch => {
                        batchSelect.append(`<option value="${batch.batch}">${batch.batch}</option>`);
                    });
                    $('#assign-batch-selection-modal').show();
                },
                error: function () {
                    alert("Error fetching batches.");
                }
            });
        });
    
        // ========== STEP 3: Confirm Batch Selection ==========
        $('#confirm-assign-batch').click(() => {
            selectedBatch = $('#assign-batch-select').val();
            console.log("Selected Batch:", selectedBatch); // 🔥 Debugging log
    
            if (!selectedBatch) {
                alert("Please select a batch.");
                return;
            }
    
            $('#assign-batch-selection-modal').hide();
            $('#assign-year-selection-modal').show();
        });
    
        // ========== STEP 4: Fetch Students by Batch & Year ==========
        $('#fetch-assign-students').click(() => {
            selectedYear = $('#assign-year-select').val();
            console.log("Selected Year:", selectedYear); // 🔥 Debugging log
            console.log("Selected Batch:", selectedBatch); // 🔥 Debugging log
        
            $.ajax({
                type: 'POST',
                url: '/getStudentsByBatchYear',
                data: JSON.stringify({ batch: selectedBatch, year: selectedYear }),
                contentType: 'application/json',
                success: function (data) {
                    console.log("Received Students:", data); // 🔥 Debugging log
        
                    let tbody = $('#assign-students-table tbody');
                    tbody.empty();
                    data.forEach(student => {
                        tbody.append(`
                            <tr data-studentid="${student.student_id}">
                                <td>${student.name}</td>
                                <td>${student.regid}</td>
                                <td><input type="checkbox" class="assign-student-checkbox" value="${student.student_id}"></td>
                            </tr>
                        `);
                    });
        
                    $('#assign-year-selection-modal').hide();
                    $('#assign-student-selection-modal').show();
                },
                error: function (xhr) {
                    console.error("Error fetching students:", xhr.responseText); // 🔥 Debugging log
                    alert("Error fetching students.");
                }
            });
        });
        
    
        // ========== STEP 5: Finalize Proctor Assignment ==========
        $('#finalize-assign-proctor').click(() => {
            let selectedStudents = $('.assign-student-checkbox:checked').map(function () {
                return parseInt($(this).val()); // 🔥 Ensure student IDs are numbers
            }).get();
        
            console.log("🔥 Final Proctor Assignment Data:", {
                proctor_id: assignProctorId,
                students: selectedStudents
            }); 
        
            if (!assignProctorId) {
                alert("Please select a proctor before assigning students.");
                return;
            }
        
            if (selectedStudents.length === 0) {
                alert("Please select at least one student.");
                return;
            }
        
            $.ajax({//RAILWAY
                type: 'POST',
                // // url: '/assignProctor',
                // url: 'http://localhost:5000/assignProctor',
                url:'https://studentsrecordsystem-production.up.railway.app/assignProctor',
                data: JSON.stringify({ proctor_id: assignProctorId, student_ids: selectedStudents }),
                contentType: 'application/json',
                success: (response) => {
                    alert(response.message || "Proctor assigned successfully!");
                    $('.modal').hide();
                },
                error: function (xhr) {
                    console.error("❌ Assign Proctor Error:", xhr.responseText); // 🔥 Debugging log
                    alert(xhr.responseText || "Error assigning proctor.");
                }
            });
        });
        
    

    // ========== REMOVE PROCTOR ==========
    $('#remove-proctor-button').click(() => {
        $.ajax({
            type: 'GET',
            url: '/getProctorsByDepartment',
            contentType: 'application/json',
            success: (data) => {
                console.log("Proctor Data Received:", data); // Debugging

                if (!Array.isArray(data) || data.length === 0) {
                    alert("No proctors found in your department.");
                    return;
                }

                $('#remove-proctor-table tbody').empty();
                data.forEach(proctor => {
                    $('#remove-proctor-table tbody').append(`
                        <tr data-proctorid="${proctor.proctor_id}">
                            <td>${proctor.name}</td>
                            <td>${proctor.designation}</td>
                            <td>${proctor.department}</td>
                            <td><input type="radio" name="remove-proctor-select" value="${proctor.proctor_id}"></td>
                        </tr>
                    `);
                });
                $('#remove-proctor-selection-modal').show();
            },
            error: function (xhr) {
               console.error("Error fetching proctors:", xhr.responseText);
            alert(xhr.responseText || "Error fetching proctors.");
            }
        });
    });
    $('#confirm-remove-proctor').click(() => {
        selectedProctorIdToRemove = $('input[name="remove-proctor-select"]:checked').val();
        if (!selectedProctorIdToRemove) {
            alert("Please select a proctor to remove.");
            return;
        }

        $.ajax({
            type: 'POST',
            url: '/removeProctorFromStudents',
            data: JSON.stringify({ proctor_id: selectedProctorIdToRemove }),
            contentType: 'application/json',
            success: function (response) {
                alert(response.message || "Proctor removed successfully.");
                $('.modal').hide();
            },
            error: function (xhr) {
                console.error("Error removing proctor:", xhr.responseText); 
                alert(xhr.responseText || "Error removing proctor.");
            }
        });
    });

    // ========== UPLOAD SUBJECTS (CSV) ==========
    $('#upload-subject-form').submit(function (event) {
        event.preventDefault();
        let formData = new FormData(this);

        $.ajax({
            type: 'POST',
            url: '/uploadSubjects',
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                alert(response.message || "Subjects uploaded successfully!");
                $('.modal').hide();
            },
            error: function (xhr) {
                alert(xhr.responseText || "Error uploading subjects.");
            }
        });
    });

// ========== EDIT SUBJECTS ==========
function loadBatches() {
    $.ajax({
        type: 'GET',
        url: '/getUniqueBatches',
        success: function (data) {
            let batchSelect = $('#batch-select');
            batchSelect.empty().append('<option value="">Select Batch</option>');
            data.forEach(batch => {
                batchSelect.append(`<option value="${batch.batch}">${batch.batch}</option>`);
            });
        },
        error: function () {
            alert("Error fetching batches.");
        }
    });
}

// ========== FETCH SUBJECTS BASED ON SELECTED BATCH ==========
$('#batch-select').change(() => {
    let selectedBatch = $('#batch-select').val();
    if (!selectedBatch) return;

    $.ajax({
        type: 'POST',
        url: '/getSubjectsByBatch',
        data: JSON.stringify({ batch: selectedBatch }),
        contentType: 'application/json',
        success: (data) => {
            $('#edit-subjects-table tbody').empty();
            data.forEach(subject => {
                $('#edit-subjects-table tbody').append(`
                    <tr data-subjectcode="${subject.subject_code}">
                        <td><input type="text" class="edit-subject-name" value="${subject.subject_name || 'N/A'}"></td>
                        <td><input type="text" class="edit-subject-code" value="${subject.subject_code || 'N/A'}"></td>
                        <td><input type="number" class="edit-credits" value="${subject.credit || 0}"></td>
                        <td><input type="number" class="edit-semester" value="${subject.semester || 1}"></td>
                        <td><input type="text" class="edit-batch" value="${subject.batch}" disabled></td>
                        <td><input type="text" class="edit-department" value="${subject.department}" disabled></td>
                    </tr>
                `);
            });
        },
        error: function (xhr) {
            alert(xhr.responseText || "Error fetching subjects.");
        }
    });
});

// ========== SAVE SUBJECT CHANGES ==========
$('#save-subject-changes').click(() => {
    let selectedBatch = $('#batch-select').val();
    if (!selectedBatch) {
        alert("Please select a batch first.");
        return;
    }

    let updatedSubjects = [];
    $('#edit-subjects-table tbody tr').each(function () {
        let subjectCode = $(this).data('subjectcode');
        let subjectName = $(this).find('.edit-subject-name').val();
        let newSubjectCode = $(this).find('.edit-subject-code').val();
        let credits = $(this).find('.edit-credits').val();
        let semester = $(this).find('.edit-semester').val();

        updatedSubjects.push({ subjectCode, subjectName, newSubjectCode, credits, semester });
    });

    $.ajax({
        type: 'POST',
        url: '/updateSubjects',
        data: JSON.stringify({ subjects: updatedSubjects, batch: selectedBatch }),
        contentType: 'application/json',
        success: function (response) {
            alert(response.message);
            $('#edit-subjects-modal').hide();
        },
        error: function (xhr) {
            alert(xhr.responseText || "Error updating subjects.");
        }
    });
});

// Load batches when the edit subjects modal is opened
$('#edit-subjects-button').click(() => {
    loadBatches();
    $('#edit-subjects-modal').show();
});
});              
function convertGoogleDriveLink(url) {
    const match = url.match(/(?:\/d\/|id=)([^\/?]+)/);
    return match ? `https://drive.google.com/thumbnail?id=${match[1]}` : url;
}

function getGoogleDriveImageUrl(fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}`;
}



document.addEventListener("DOMContentLoaded", async function () {
    try {
        const response = await fetch("/getUserProfile");
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        const profileImg = document.getElementById("profilePhoto");

        if (data.profilePhoto && data.profilePhoto.trim() !== "") {
            profileImg.src = convertGoogleDriveLink(data.profilePhoto);
        } else {
            profileImg.src = "/images/default-image.jpeg";
        }

        profileImg.onerror = function () {
            profileImg.src = "/images/default-image.jpeg"; // Fallback if image fails to load
        };

    } catch (error) {
        console.error("❌ Error loading profile data:", error);
        document.getElementById("profilePhoto").src = "/images/default-image.jpeg";
    }
});

