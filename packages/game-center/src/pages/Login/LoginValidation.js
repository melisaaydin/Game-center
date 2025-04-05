// function Validation(values) {
//     let error = {}
//     const email_pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
//     const password_pattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9]{8,}$/
//     if (values.email === "") {
//         error.email = "Email should not be empty"
//     }
//     else if (!email_pattern.test(values.email)) {
//         error.email = "Email did not match!"
//     }
//     else {
//         error.email = ""
//     }
//     if (values.password === "") {
//         error.password = "Password should not be empty!"
//     }
//     else if (!password_pattern.test(values.password)) {
//         error.password = "Password did not match!"
//     }
//     else {
//         error.password = ""
//     }
//     return error;
// }
// export default Validation;
function Validation(values) {
    let error = {}
    const email_pattern = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    const password_pattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9]{8,}$/;

    if (!values.email) {
        error.email = "Email should not be empty";
    } else if (!email_pattern.test(values.email)) {
        error.email = "Invalid email format!";
    }

    if (!values.password) {
        error.password = "Password should not be empty!";
    } else if (!password_pattern.test(values.password)) {
        error.password = "Password must contain at least 8 characters, 1 uppercase, 1 lowercase, and 1 number!";
    }

    return error;
}
export default Validation;
