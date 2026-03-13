import * as argon2 from "argon2";

const passwordHash  = await argon2.hash("WaqasAhmad313");
const accessKeyHash = await argon2.hash("244941");

console.log(passwordHash);
console.log(accessKeyHash);