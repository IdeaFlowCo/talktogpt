import React, { useRef, useState } from 'react';
import { Transition, Dialog } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import AuthSocial from 'components/AuthSocial';
import { useAuth } from 'util/auth';

// Warning: this is deprecated. I use AuthModal now. May still work though, and still is being used in Settings Page.
function ReauthModal(props) {
  const auth = useAuth();
  const [pending, setPending] = useState(false);
  const [formAlert, setFormAlert] = useState(null);
  const cancelButtonRef = useRef(null);

  const { register, handleSubmit, errors } = useForm();

  const onSubmit = (data) => {
    const { pass } = data;
    setPending(true);

    auth
      .signin(auth.user.email, pass)
      .then(() => {
        // Call failed action that originally required reauth
        props.callback();
        // Let parent know we're done so they can hide modal
        props.onDone();
      })
      .catch((error) => {
        // Hide pending indicator
        setPending(false);
        // Show error alert message
        setFormAlert({
          type: 'error',
          message: error.message,
        });
      });
  };

  return (
    <Transition appear={true} show={true}>
      <Dialog
        as='div'
        className='fixed inset-0 z-10 overflow-y-auto'
        onClose={() => props.onDone()}
      >
        <div className='min-h-screen px-4 text-center'>
          <Transition.Child
            as={React.Fragment}
            enter='ease-out duration-300'
            enterFrom='opacity-0'
            enterTo='opacity-100'
            leave='ease-in duration-200'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
          >
            <Dialog.Overlay className='fixed inset-0 bg-gray-500 bg-opacity-75' />
          </Transition.Child>
          <span
            className='inline-block h-screen align-middle'
            aria-hidden='true'
          >
            &#8203;
          </span>
          <Transition.Child
            as={React.Fragment}
            enter='ease-out duration-300'
            enterFrom='opacity-0'
            enterTo='opacity-100'
            leave='ease-in duration-200'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
          >
            <div className='my-8 inline-block w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all'>
              <Dialog.Title
                as='h3'
                className='text-lg font-medium leading-6 text-gray-900'
              >
                Please sign in again to complete this action
              </Dialog.Title>
              <div className='mt-4'>
                {formAlert && (
                  <div className='mb-4 text-red-600'>{formAlert.message}</div>
                )}

                {props.provider === 'password' && (
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <input
                      className='w-full rounded border border-gray-300 bg-white py-1 px-3 leading-8 outline-none focus:border-indigo-500 focus:ring-1'
                      name='pass'
                      type='password'
                      placeholder='Password'
                      ref={register({
                        required: 'Please enter your password',
                      })}
                    />

                    {errors.pass && (
                      <p className='mt-1 text-left text-sm text-red-600'>
                        {errors.pass.message}
                      </p>
                    )}

                    <div className='mt-4'>
                      <button
                        className='inline-flex justify-center rounded-md border border-gray-300 py-2 px-4 text-sm font-medium hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
                        type='button'
                        onClick={() => props.onDone()}
                        ref={cancelButtonRef}
                      >
                        Cancel
                      </button>
                      <button
                        className='ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-500 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
                        type='submit'
                        disabled={pending}
                      >
                        {pending ? '...' : 'Sign in'}
                      </button>
                    </div>
                  </form>
                )}

                {props.provider !== 'password' && (
                  <AuthSocial
                    buttonAction='Sign in'
                    providers={[props.provider]}
                    showLastUsed={false}
                    onAuth={() => {
                      props.callback();
                      props.onDone();
                    }}
                    onError={(message) => {
                      setFormAlert({
                        type: 'error',
                        message: message,
                      });
                    }}
                  />
                )}
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

export default ReauthModal;
