import { useState, useCallback } from "react";
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

const sleep = async (time) =>
  new Promise((resolve) => setTimeout(resolve, time));

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
