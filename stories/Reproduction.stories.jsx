import { useState, useCallback, useRef, useEffect } from "react";
import { expect, jest } from "@storybook/jest";
import { userEvent, within } from "@storybook/testing-library";

export default {
  title: "Reproduction",
};

const RefreshyComponent = ({ getData }) => {
  const [count, setCount] = useState(0);
  const [data, setData] = useState(null);

  const ping = useCallback(() => {
    getData(count).then((freshData) => {
      setData(freshData);
      setCount((c) => c + 1);
    });
  }, [count]);

  return (
    <div>
      Fetched {count} times, current data: <pre>{JSON.stringify(data)}</pre>
      <button data-testid="pushy" onClick={ping}>
        Refresh
      </button>
    </div>
  );
};

export const MocksRequireClearing = ({ getData }) => (
  <>
    <p>
      This component calls an async function that returns data after 200ms when
      the button is clicked. The interaction test will click the button and test
      the call was made, along with its inputs and outputs.
    </p>
    <RefreshyComponent getData={getData} />
  </>
);

MocksRequireClearing.args = {
  getData: jest.fn(
    (count) =>
      new Promise((resolve, reject) =>
        setTimeout(() => resolve(`Result for call #${count}`), 200)
      )
  ),
};

MocksRequireClearing.play = async ({ canvasElement, args }) => {
  // uncomment this to fix some of the debug stepping problems
  // args.getData.mockClear();
  const button = await within(canvasElement).findByTestId("pushy");
  await expect(args.getData.mock.calls.length).toBe(0);
  userEvent.click(button);
  await expect(args.getData.mock.calls.length).toBe(1);
  await expect(args.getData.mock.lastCall).toEqual([0]);
  await expect(await args.getData.mock.results[0].value).toEqual(
    "Result for call #0"
  );
  userEvent.click(button);
  await expect(args.getData.mock.calls.length).toBe(2);
  await expect(args.getData.mock.lastCall).toEqual([1]);
  await expect(await args.getData.mock.results[1].value).toEqual(
    "Result for call #1"
  );
  userEvent.click(button);
  await expect(args.getData.mock.calls.length).toBe(3);
  await expect(args.getData.mock.lastCall).toEqual([2]);
  await expect(await args.getData.mock.results[2].value).toEqual(
    "Result for call #2"
  );
};

export const MocksWithState = ({ getData }) => {
  const [data, setData] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    timer.current = setInterval(() => {
      getData()
        .then((data) => setData({ type: "success", data }))
        .catch((err) => setData({ type: "error", data: err }));
    }, 1000);
  }, []);

  return (
    <>
      <p>
        This component will fake a call to an API whose state changes over time.
        The mocks must reflect that state, and be able to rewind steps when
        needed.
      </p>
      <p>
        The first call will succeed, the second will fail, and the thirt will
        succeed again.
      </p>
      <p>Current result: {JSON.stringify(data)}</p>
    </>
  );
};

MocksWithState.args = {
  getData: jest
    .fn()
    .mockReturnValueOnce(Promise.resolve({ response: "Yes!" }))
    .mockReturnValueOnce(Promise.reject(new Error("WTF")))
    .mockReturnValueOnce(Promise.resolve({ response: "Second yes!" })),
};

const sleep = async (time) =>
  new Promise((resolve) => setTimeout(resolve, time));

MocksWithState.play = async ({ args }) => {
  args.getData.mockClear();
  do {
    await sleep(100);
  } while (args.getData.mock.calls.length < 1);
  await expect(await args.getData.mock.results[0].value).toEqual({
    response: "Yes!",
  });
  do {
    await sleep(100);
  } while (args.getData.mock.calls.length < 2);
  await args.getData.mock.results[1].value.catch((value) =>
    expect(value).toBeInstanceOf(Error)
  );
  do {
    await sleep(100);
  } while (args.getData.mock.calls.length < 3);
  await expect(await args.getData.mock.results[2].value).toEqual({
    response: "Second yes!",
  });
};
