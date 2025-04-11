import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Generate a UUID for the filename
    const uuid = uuidv4();
    const fileExtension = file.name.split(".").pop();
    const fileName = `${uuid}.${fileExtension}`;

    // Create the uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public", "uploads", "backgrounds");
    const bytes = await file.arrayBuffer();
    await writeFile(join(uploadDir, fileName), new Uint8Array(bytes));

    // Return the file path that can be used to access the image
    return NextResponse.json({
      success: true,
      filePath: `/uploads/backgrounds/${fileName}`,
    });
  } catch (error) {
    console.error("Error uploading background:", error);
    return NextResponse.json(
      { error: "Error uploading file" },
      { status: 500 }
    );
  }
}
