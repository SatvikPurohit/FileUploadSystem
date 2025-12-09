// src/__tests__/UploadPage.test.tsx
import React from "react";
import { screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import {
  getFileInput,
  renderWithProviders,
  renderWithProvidersAsync,
} from "../tests/test-utils";
import UploadPage from "../modules/uploads/UploadPage";
import api from "../api/axios";

jest.mock("../api/axios");

function makeFile(name: string, size = 1024, type = "text/plain") {
  return new File([new ArrayBuffer(size)], name, { type });
}

async function attachFileToInput(file: File) {
  // prefer the input[type="file"] change event — reliable in jsdom
  const input = document.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement | null;
  if (!input) throw new Error("file input not found");
  // jsdom supports setting files by using DataTransfer
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  // assign files to input and dispatch change
  Object.defineProperty(input, "files", { value: dataTransfer.files });
  fireEvent.change(input);
  return input;
}

test("adds files and rejects wrong type", async () => {
  const utils = await renderWithProvidersAsync(<UploadPage />);

  // find file input robustly
  const input = getFileInput(utils.container);

  const goodFile = new File(["dummy content"], "test.pdf", {
    type: "application/pdf",
  });
  const badFile = new File(["bad"], "bad.exe", {
    type: "application/x-msdownload",
  });

  // add good file (wrap in act)
  await act(async () => {
    fireEvent.change(input, { target: { files: [goodFile] } });
    // allow uploaded item to be processed (microtask)
    await new Promise((r) => setTimeout(r, 0));
  });

  const listItems = await screen.findAllByRole("listitem");
  expect(listItems.length).toBeGreaterThan(0);

  // find a list item that contains the filename
  const itemWithFile = listItems.find((li) =>
    within(li).queryByText(/test.pdf/i)
  );
  expect(itemWithFile).toBeDefined();

  // add bad file
  await act(async () => {
    fireEvent.change(input, { target: { files: [badFile] } });
    await new Promise((r) => setTimeout(r, 0));
  });

  await waitFor(() =>
    expect(screen.getByText(/invalid file type/i)).toBeInTheDocument()
  );
});

test("uploads files with progress and completes", async () => {
  const postMock = api.post as unknown as jest.Mock;

  postMock.mockImplementation((_url: string, _form: FormData, config: any) => {
    const total = 100;

    // simulate progress events
    setTimeout(() => config?.onUploadProgress?.({ loaded: 20, total }), 30);
    setTimeout(() => config?.onUploadProgress?.({ loaded: 60, total }), 60);

    // resolve after a bit so onSuccess runs and Snackbar opens
    return new Promise((res) =>
      setTimeout(() => res({ data: { ok: true } }), 120)
    );
  });

  renderWithProviders(<UploadPage />);

  const file = makeFile("doc.txt", 1024, "text/plain");

  // Prefer input change (reliable)
  try {
    await attachFileToInput(file);
  } catch (e) {
    // fallback to well-shaped drop event
    const labelNode = screen.queryByText(/Drag & drop files here/i);
    const dropTarget =
      labelNode?.closest("div") || document.querySelector('input[type="file"]');
    if (!dropTarget)
      throw new Error("Could not find drop target element in DOM");
    fireEvent.drop(dropTarget as Element, {
      dataTransfer: {
        files: [file],
        items: [{ kind: "file", type: file.type, getAsFile: () => file }],
        types: ["Files"],
      },
    });
  }

  // Wait until the page shows the uploaded filename message somewhere in body text.
  await waitFor(
    () => {
      const text = document.body.textContent || "";
      if (!new RegExp(`Uploaded\\s*${file.name}`, "i").test(text)) {
        throw new Error("not found yet");
      }
      return true;
    },
    { timeout: 3000 }
  );

  expect(document.body.textContent).toMatch(
    new RegExp(`Uploaded\\s*${file.name}`, "i")
  );
});
