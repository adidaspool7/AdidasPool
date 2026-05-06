import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "@client/components/ui/input";

const meta = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "search", "url"],
    },
    disabled: { control: "boolean" },
  },
  args: {
    placeholder: "Type here...",
    type: "text",
  },
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Email: Story = { args: { type: "email", placeholder: "you@example.com" } };
export const Password: Story = { args: { type: "password", placeholder: "••••••••" } };
export const Disabled: Story = { args: { disabled: true, value: "Locked value" } };
