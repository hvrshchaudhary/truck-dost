function Form() {
    return (
      <div className="container">
        <h1>Truck Dost</h1>
        <form>
          <label htmlFor="firstname">First Name</label>
          <input
            type="text"
            placeholder="Enter First Name"
            name="firstname"
            id="firstname"
          />
  
          <label htmlFor="lastname">Last Name</label>
          <input
            type="text"
            placeholder="Enter Last Name"
            name="lastname"
            id="lastname"
          />
  
          <label htmlFor="password">Password</label>
          <input
            type="password"
            placeholder="Enter Password"
            name="password"
            id="password"
          />
  
          <label htmlFor="email">Email</label>
          <input
            type="email"
            placeholder="Enter Email"
            name="email"
            id="email"
          />
  
          <label htmlFor="contact">Contact</label>
          <input
            type="text"
            placeholder="Enter your Contact"
            name="contact"
            id="contact"
          />
  
          <label htmlFor="date">Date</label>
          <input
            type="date"
            placeholder="Enter Date"
            name="date"
            id="date"
          />
  
          <button type="reset">Reset</button>
          <button type="submit">Submit</button>
        </form>
      </div>
    );
  }
  
  export default Form;
  