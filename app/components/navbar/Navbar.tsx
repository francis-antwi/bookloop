import { User } from "@prisma/client";
import Container from "../Container";
import Logo from "./Logo";
import Search from "./Search";
import UserMenu from "./UserMenu";
import Categories from "./Categories";

interface NavbarProps {
  currentUser?: User | null;
}

const Navbar: React.FC<NavbarProps> = ({
  currentUser
}) => {

  return (
    <div className="fixed w-full bg-white/80 backdrop-blur-md z-10 shadow-lg border-b border-gray-100">
      <div className="py-5">
        <Container>
          <div className="
            flex
            flex-row
            items-center
            justify-between
            gap-4
            md:gap-8
          ">
            <Logo />
            <Search />
            <UserMenu currentUser={currentUser} />
          </div>
        </Container>
        <Categories />
      </div>
    </div>
  );
};

export default Navbar;