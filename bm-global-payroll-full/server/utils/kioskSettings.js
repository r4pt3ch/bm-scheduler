import bcrypt from 'bcryptjs'
import AppSetting from '~/server/models/AppSetting'

const KIOSK_PASSWORD_KEY = 'dtr_kiosk_password_hash'

export async function getKioskPasswordHash() {
  const setting = await AppSetting.findOne({ key: KIOSK_PASSWORD_KEY })
  return setting?.value || null
}

export async function setKioskPassword(plainPassword) {
  const hash = await bcrypt.hash(plainPassword, 10)
  await AppSetting.findOneAndUpdate(
    { key: KIOSK_PASSWORD_KEY },
    { key: KIOSK_PASSWORD_KEY, value: hash },
    { upsert: true }
  )
}

export async function verifyKioskPassword(plainPassword) {
  const hash = await getKioskPasswordHash()
  if (!hash) return false
  return bcrypt.compare(plainPassword, hash)
}

export async function hasKioskPasswordBeenSet() {
  const hash = await getKioskPasswordHash()
  return !!hash
}
