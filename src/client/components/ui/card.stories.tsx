import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@client/components/ui/card";
import { Button } from "@client/components/ui/button";

const meta = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Candidate match</CardTitle>
        <CardDescription>Top result for Senior Engineer</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Fit score 87 — eligible across all required criteria.
        </p>
      </CardContent>
      <CardFooter className="px-6 flex gap-2">
        <Button size="sm">View profile</Button>
        <Button size="sm" variant="outline">Shortlist</Button>
      </CardFooter>
    </Card>
  ),
};

export const TitleOnly: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Empty state</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">No candidates yet.</p>
      </CardContent>
    </Card>
  ),
};
