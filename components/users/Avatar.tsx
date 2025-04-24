import Image from "next/image";

import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type Props = {
  name: string;
  otherStyles?: string;
};

const Avatar = ({ name, otherStyles }: Props) => {
  return (
    <div
      className={`relative h-9 w-9 rounded-full ${otherStyles}`}
      data-tooltip={name}
    >
      <Image
        src='/placeholder-avatar.png'
        alt={name}
        fill
        className='rounded-full'
      />
    </div>
  );
};

export default Avatar;
