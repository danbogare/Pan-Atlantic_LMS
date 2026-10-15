import crypto from "crypto";
import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { IAuthUserPayload } from "../interfaces/auth.interface"; // Path to your global Express types

export interface ICryptoService {
    hashPassword(password: string): Promise<string>;
    comparePassword(password: string, hash: string): Promise<boolean>;
    generateToken(payload: IAuthUserPayload, expiresIn?: SignOptions["expiresIn"]): string;
    verifyToken(token: string): IAuthUserPayload;
    generateTempPass(): string;
    generateOTP(): string;
}

export class CryptoService implements ICryptoService {
  private readonly saltRounds = 12;

  constructor(private readonly jwtSecret: string) {}

  public async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
  }

  public async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  public generateToken(
    payload: IAuthUserPayload,
    expiresIn: SignOptions["expiresIn"] = "7d"
  ): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn });
  }

  public verifyToken(token: string): IAuthUserPayload {
    return jwt.verify(token, this.jwtSecret) as IAuthUserPayload;
  }

  // 16 random chars (~95 bits) with at least one of each character class, so it also meets the
  // password policy. Look-alike characters (0/O, 1/l/I) and HTML-sensitive ones (&, <, >) are left
  // out because users copy it from an HTML email.
  public generateTempPass(length: number = 16): string {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const digits = "23456789";
    const symbols = "!@#$%*-_+=?";
    const all = upper + lower + digits + symbols;

    const pick = (charset: string): string => charset[crypto.randomInt(charset.length)]!;

    const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
    while (chars.length < length) {
      chars.push(pick(all));
    }

    // Fisher-Yates shuffle so the guaranteed characters aren't always at the start
    for (let i = chars.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j]!, chars[i]!];
    }

    return chars.join("");
  }
  
  public generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }
}