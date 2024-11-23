import { validateRequest } from "@/auth";
import { createUploadthing, FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

export const fileRoute = {
  profilePic: f({
    image: { maxFileSize: "512KB" },
  }).middleware(async () => {
    const { user } = await validateRequest();

    if (!user) throw new UploadThingError("Unauthorized");

    return { user };
  }),
} satisfies FileRouter;
