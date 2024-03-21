import crypto from 'node:crypto'

export function getNewSalt() {
  return crypto.randomBytes(32).toString('hex')
}

export function hashPassword({
  password,
  salt,
}: {
  password: string
  salt: string
}) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
}
