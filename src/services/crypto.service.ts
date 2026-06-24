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

  public generateTempPass(): string {
    return `PA.LMS-${crypto.randomBytes(4).toString("hex")}`
  }
  
  public generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }
}