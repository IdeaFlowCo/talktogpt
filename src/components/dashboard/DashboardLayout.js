import { Fragment, useState } from 'react';
import { Dialog, Menu, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  BellIcon,
  CalendarIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  FolderIcon,
  HomeIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/20/solid';
import Link from 'next/link';
import { useAuth } from 'util/auth';
import Logo from 'components/atoms/Logo';
import DashboardHome from '../old/home/DashboardHome';

const navigation = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon },
  // { name: "Deepforms", href: "/dashboard/deepforms", icon: FolderIcon },
  // { name: "Submissions", href: "", icon: UsersIcon },
  //   { name: 'Calendar', href: '#', icon: CalendarIcon },
  //   { name: 'Documents', href: '#', icon: DocumentDuplicateIcon },
  //   { name: 'Reports', href: '#', icon: ChartPieIcon },
];
const teams = [
  { id: 1, name: 'Product', href: '#', initial: 'H' },
  { id: 2, name: 'Sales', href: '#', initial: 'T' },
  { id: 3, name: 'Marketing', href: '#', initial: 'W' },
];

// Aren't using this because Signout has a special need to call auth.signout()
// const userNavigation = [
//     { name: "Your profile", href: "/settings/general" },
//     { name: "Sign out", href: "/auth/signout" },
// ];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function DashboardLayout({
  children,
  currentPage,
  currentTeam,
}) {
  const auth = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <div>
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog
            as='div'
            className='relative z-50
                        lg:hidden'
            onClose={setSidebarOpen}
          >
            <Transition.Child
              as={Fragment}
              enter='transition-opacity ease-linear duration-300'
              enterFrom='opacity-0'
              enterTo='opacity-100'
              leave='transition-opacity ease-linear duration-300'
              leaveFrom='opacity-100'
              leaveTo='opacity-0'
            >
              <div className='fixed inset-0 bg-gray-900/80' />
            </Transition.Child>

            <div className='fixed inset-0 flex'>
              <Transition.Child
                as={Fragment}
                enter='transition ease-in-out duration-300 transform'
                enterFrom='-translate-x-full'
                enterTo='translate-x-0'
                leave='transition ease-in-out duration-300 transform'
                leaveFrom='translate-x-0'
                leaveTo='-translate-x-full'
              >
                <Dialog.Panel className='relative mr-16 flex w-full max-w-xs flex-1'>
                  <Transition.Child
                    as={Fragment}
                    enter='ease-in-out duration-300'
                    enterFrom='opacity-0'
                    enterTo='opacity-100'
                    leave='ease-in-out duration-300'
                    leaveFrom='opacity-100'
                    leaveTo='opacity-0'
                  >
                    <div className='absolute left-full top-0 flex w-16 justify-center pt-5'>
                      <button
                        type='button'
                        className='-m-2.5 p-2.5'
                        onClick={() => setSidebarOpen(false)}
                      >
                        <span className='sr-only'>Close sidebar</span>
                        <XMarkIcon
                          className='h-6 w-6 text-white'
                          aria-hidden='true'
                        />
                      </button>
                    </div>
                  </Transition.Child>
                  {/* Sidebar component, swap this element with another sidebar if you like */}
                  <div className='flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4'>
                    <div className='mt-5 flex h-16 shrink-0 items-center'>
                      {/* <img
                                                className="h-8 w-auto"
                                                src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
                                                alt="Your Company"
                                            /> */}
                      <Logo />
                    </div>
                    <nav className='flex flex-1 flex-col'>
                      <ul role='list' className='flex flex-1 flex-col gap-y-7'>
                        <li>
                          <ul role='list' className='-mx-2 space-y-1'>
                            {navigation.map((item) => (
                              <li key={item.name}>
                                <Link href={item.href} legacyBehavior>
                                  <div
                                    className={classNames(
                                      item.name === currentPage
                                        ? 'bg-gray-50 text-indigo-600'
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600',
                                      'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
                                    )}
                                  >
                                    <item.icon
                                      className={classNames(
                                        item.name === currentPage
                                          ? 'text-indigo-600'
                                          : 'text-gray-400 group-hover:text-indigo-600',
                                        'h-6 w-6 shrink-0'
                                      )}
                                      aria-hidden='true'
                                    />
                                    {item.name}
                                  </div>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                        {/* <li>
                                                    <div className="text-xs font-semibold leading-6 text-gray-400">
                                                        Your teams
                                                    </div>
                                                    <ul
                                                        role="list"
                                                        className="-mx-2 mt-2 space-y-1"
                                                    >
                                                        {teams.map((team) => (
                                                            <li key={team.name}>
                                                                <Link
                                                                    href={
                                                                        team.href
                                                                    }
                                                                >
                                                                    <div
                                                                        className={classNames(
                                                                            team.name ===
                                                                                currentTeam
                                                                                ? "bg-gray-50 text-indigo-600"
                                                                                : "text-gray-700 hover:text-indigo-600 hover:bg-gray-50",
                                                                            "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                                                                        )}
                                                                    >
                                                                        <span
                                                                            className={classNames(
                                                                                team.name ===
                                                                                    currentTeam
                                                                                    ? "text-indigo-600 border-indigo-600"
                                                                                    : "text-gray-400 border-gray-200 group-hover:border-indigo-600 group-hover:text-indigo-600",
                                                                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[0.625rem] font-medium bg-white"
                                                                            )}
                                                                        >
                                                                            {
                                                                                team.initial
                                                                            }
                                                                        </span>
                                                                        <span className="truncate">
                                                                            {
                                                                                team.name
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </Link>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </li> */}
                        <li className='mt-auto'>
                          <Link href='/settings/general' legacyBehavior>
                            <div className='group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600'>
                              <Cog6ToothIcon
                                className='h-6 w-6 shrink-0 text-gray-400 group-hover:text-indigo-600'
                                aria-hidden='true'
                              />
                              Settings
                            </div>
                          </Link>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Static sidebar for desktop */}
        <div className='hidden lg:fixed lg:inset-y-0 lg:z-10 lg:flex lg:w-72 lg:flex-col'>
          {/* Sidebar component, swap this element with another sidebar if you like */}
          <div className='flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4'>
            <div className='mt-2 flex h-16 shrink-0 items-center'>
              {/* <img
                                className="h-8 w-auto"
                                src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
                                alt="Your Company"
                            /> */}
              <Logo />
            </div>
            <nav className='flex flex-1 flex-col'>
              <ul role='list' className='flex flex-1 flex-col gap-y-7'>
                <li>
                  <ul role='list' className='-mx-2 space-y-1'>
                    {navigation.map((item) => (
                      <li key={item.name}>
                        <Link href={item.href} legacyBehavior>
                          <div
                            className={classNames(
                              item.name === currentPage
                                ? 'bg-gray-50 text-indigo-600'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600',
                              'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
                            )}
                          >
                            <item.icon
                              className={classNames(
                                item.name === currentPage
                                  ? 'text-indigo-600'
                                  : 'text-gray-400 group-hover:text-indigo-600',
                                'h-6 w-6 shrink-0'
                              )}
                              aria-hidden='true'
                            />
                            {item.name}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
                {/* <li>
                                    <div className="text-xs font-semibold leading-6 text-gray-400">
                                        {teams.length > 0 ? "Your Teams" : ""}
                                    </div>
                                    <ul
                                        role="list"
                                        className="-mx-2 mt-2 space-y-1"
                                    >
                                        {teams.map((team) => (
                                            <li key={team.name}>
                                                <Link href={team.href}>
                                                    <div
                                                        className={classNames(
                                                            team.current
                                                                ? "bg-gray-50 text-indigo-600"
                                                                : "text-gray-700 hover:text-indigo-600 hover:bg-gray-50",
                                                            "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                                                        )}
                                                    >
                                                        <span
                                                            className={classNames(
                                                                team.current
                                                                    ? "text-indigo-600 border-indigo-600"
                                                                    : "text-gray-400 border-gray-200 group-hover:border-indigo-600 group-hover:text-indigo-600",
                                                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[0.625rem] font-medium bg-white"
                                                            )}
                                                        >
                                                            {team.initial}
                                                        </span>
                                                        <span className="truncate">
                                                            {team.name}
                                                        </span>
                                                    </div>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </li> */}
                <li className='mt-auto'>
                  <Link href='/settings/general' legacyBehavior>
                    <div className='group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600'>
                      <Cog6ToothIcon
                        className='h-6 w-6 shrink-0 text-gray-400 group-hover:text-indigo-600'
                        aria-hidden='true'
                      />
                      Settings
                    </div>
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className='lg:ml-72'>
          <div className='sticky top-0 z-10 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8'>
            <button
              type='button'
              className='-m-2.5 p-2.5 text-gray-700 lg:hidden'
              onClick={() => setSidebarOpen(true)}
            >
              <span className='sr-only'>Open sidebar</span>
              <Bars3Icon className='h-6 w-6' aria-hidden='true' />
            </button>

            {/* Separator */}
            <div
              className='h-6 w-px bg-gray-200 lg:hidden'
              aria-hidden='true'
            />

            <div className='flex flex-1 gap-x-4 self-stretch lg:gap-x-6'>
              <form className='relative flex flex-1' action='#' method='GET'>
                {/* TODO: add search functionality */}
                {/* <label
                                    htmlFor="search-field"
                                    className="sr-only"
                                >
                                    Search
                                </label>
                                <MagnifyingGlassIcon
                                    className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400"
                                    aria-hidden="true"
                                />
                                <input
                                    id="search-field"
                                    className="block h-full w-full border-0 py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                                    placeholder="Search..."
                                    type="search"
                                    name="search"
                                /> */}
              </form>
              <div className='flex items-center gap-x-4 lg:gap-x-6'>
                {/* TODO: Notifications */}
                {/* <button
                                    type="button"
                                    className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
                                >
                                    <span className="sr-only">
                                        View notifications
                                    </span>
                                    <BellIcon
                                        className="h-6 w-6"
                                        aria-hidden="true"
                                    />
                                </button> */}

                {/* Separator */}
                <div
                  className='hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200'
                  aria-hidden='true'
                />

                {/* Profile dropdown */}
                <Menu as='div' className='relative'>
                  <Menu.Button className='-m-1.5 flex items-center p-1.5'>
                    <span className='sr-only'>Open user menu</span>
                    {/* <img
                                            className="h-8 w-8 rounded-full bg-gray-50"
                                            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                                            alt=""
                                        /> */}
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                      strokeWidth={1.5}
                      stroke='currentColor'
                      className='h-6 w-6'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z'
                      />
                    </svg>

                    <span className='hidden lg:flex lg:items-center'>
                      <span
                        className='ml-4 text-sm font-semibold leading-6 text-gray-900'
                        aria-hidden='true'
                      >
                        {auth.user.name ? auth.user.name : 'Account'}
                      </span>
                      <ChevronDownIcon
                        className='ml-2 h-5 w-5 text-gray-400'
                        aria-hidden='true'
                      />
                    </span>
                  </Menu.Button>
                  <Transition
                    as={Fragment}
                    enter='transition ease-out duration-100'
                    enterFrom='transform opacity-0 scale-95'
                    enterTo='transform opacity-100 scale-100'
                    leave='transition ease-in duration-75'
                    leaveFrom='transform opacity-100 scale-100'
                    leaveTo='transform opacity-0 scale-95'
                  >
                    <Menu.Items className='absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none'>
                      {/* {userNavigation.map((item) => (
                                                <Menu.Item key={item.name}>
                                                    {({ active }) => (
                                                        <a
                                                            href={item.href}
                                                            className={classNames(
                                                                active
                                                                    ? "bg-gray-50"
                                                                    : "",
                                                                "block px-3 py-1 text-sm leading-6 text-gray-900"
                                                            )}
                                                        >
                                                            {item.name}
                                                        </a>
                                                    )}
                                                </Menu.Item>
                                            ))} */}
                      <Menu.Item key='settings'>
                        {({ active }) => (
                          <Link href='/settings/general' legacyBehavior>
                            <button
                              className={classNames(
                                active ? 'bg-gray-50' : '',
                                'block px-3 py-1 text-sm leading-6 text-gray-900'
                              )}
                            >
                              Settings
                            </button>
                          </Link>
                        )}
                      </Menu.Item>
                      <Menu.Item key='signout'>
                        {({ active }) => (
                          <Link href='/auth/signout' legacyBehavior>
                            <button
                              className={classNames(
                                active ? 'bg-gray-50' : '',
                                'block px-3 py-1 text-sm leading-6 text-gray-900'
                              )}
                              onClick={(e) => {
                                e.preventDefault();
                                auth.signout();
                              }}
                            >
                              Sign out
                            </button>
                          </Link>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            </div>
          </div>
        </div>
        <main className='ml-72 py-10'>
          <div className='px-4 sm:px-6 lg:px-8'>
            {/* Your content */}

            {children}
          </div>
        </main>
      </div>
    </>
  );
}
