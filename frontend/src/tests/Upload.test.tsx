// src/__tests__/UploadPage.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UploadPage from "../modules/uploads/UploadPage";
import api from "../api/axios";

jest.mock("../api/axios");

function makeFile(name: string, size = 1024, type = "text/plain") {
  const file = new File([new ArrayBuffer(size)], name, { type });
  return file;
}

test("adds files and rejects wrong type", async () => {
  render(<UploadPage />);
  const input =
    screen.getByLabelText(/Drag & drop files here/i) ||
    screen.getByTestId("file-input");
  const file = makeFile("bad.exe", 1000, "application/octet-stream");
  // fire drop event
  fireEvent.drop(input, {
    dataTransfer: {
      files: [file],
      items: [{ kind: "file", type: file.type, getAsFile: () => file }],
    },
  });
  expect(await screen.findByText("Invalid file type")).toBeInTheDocument();
});

test("uploads files with progress and completes", async () => {
  const postMock = api.post as jest.Mock;
  postMock.mockImplementation((_url, _form, config) => {
    // simulate progress then resolve
    const total = 100;
    setTimeout(() => {
      if (config.onUploadProgress)
        config.onUploadProgress({ loaded: 50, total });
    }, 10);
    setTimeout(() => {
      if (config.onUploadProgress)
        config.onUploadProgress({ loaded: total, total });
    }, 20);
    return Promise.resolve({ data: { ok: true } });
  });

  render(<UploadPage />);
  const file = makeFile("doc.txt", 1024, "text/plain");
  const input =
    screen.getByLabelText(/Drag & drop files here/i) ||
    screen.getByTestId("file-input");
  fireEvent.drop(input, {
    dataTransfer: {
      files: [file],
      items: [{ kind: "file", type: file.type, getAsFile: () => file }],
    },
  });

  // wait for success notification
  await waitFor(
    () => expect(screen.getByText(/Uploaded/)).toBeInTheDocument(),
    { timeout: 2000 }
  );
});
