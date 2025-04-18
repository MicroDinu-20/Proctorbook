// Event Listener for Forgot Password Form Submission
document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission

    // Get email and role from form inputs
    const email = document.getElementById('email').value.trim();
    const role = document.getElementById('role').value;

    // Frontend Validation
    if (!email || !role) {
        alert('Please fill out both the email and role fields.');
        return;
    }

    // Validate email format using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    try {
        // Send POST request to the forgot password endpoint
        const response = await fetch('/forgotPassword', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, role }), // Send email and role as JSON
            cache: "no-store"
        });

        // Get the message display element
        const messageElement = document.getElementById('message');

        if (response.ok) {
            // Parse JSON response and display success message
            const data = await response.json();
            messageElement.textContent = data.message;
            messageElement.style.color = 'green';

            // Redirect to reset password page after a delay
            setTimeout(() => {
                window.location.href = '/resetPassword';
            }, 4000);
        } else {
            // Parse and display error message
            const errorMessage = await response.text();
            messageElement.textContent = `Error: ${errorMessage}`;
            messageElement.style.color = 'red';
        }
    } catch (error) {
        // Handle unexpected errors
        const messageElement = document.getElementById('message');
        messageElement.textContent = `Error: ${error.message}`;
        messageElement.style.color = 'red';
    }
});
